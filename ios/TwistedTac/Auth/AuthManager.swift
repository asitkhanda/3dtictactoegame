import AuthenticationServices
import CryptoKit
import Foundation
import Observation
import Supabase
import TwistedTacKit

/// Account state for the whole app: Sign in with Apple, the player's profile,
/// and username onboarding. Mirrors src/contexts/AuthContext.tsx.
@Observable
final class AuthManager {
    enum Phase: Equatable {
        case loading
        case signedOut
        /// Signed in, but the profile has no username yet.
        case needsUsername
        case ready
    }

    private(set) var phase: Phase = .loading
    private(set) var profile: Profile?
    private(set) var userID: String?
    /// Which providers this account has signed in with ("apple", "google", ...).
    private(set) var identityProviders: Set<String> = []
    var errorMessage: String?
    private(set) var isWorking = false

    var isConfigured: Bool { Backend.isConfigured }
    var isSignedIn: Bool { userID != nil }
    /// Apple asks apps to revoke Sign in with Apple access when an account is deleted.
    var hasAppleIdentity: Bool { identityProviders.contains("apple") }

    /// Where the browser sends the player back to the app after Google sign-in.
    /// Must be on Supabase's redirect allow-list.
    static let oauthCallback = URL(string: "twistedtac://login-callback")!

    private var rawNonce: String?
    private var pendingFullName: String?
    private var listener: Task<Void, Never>?

    // MARK: Lifecycle

    /// Starts following the auth session. Call once at launch.
    func start() {
        guard listener == nil else { return }
        guard let client = Backend.client else {
            phase = .signedOut
            return
        }
        listener = Task { [weak self] in
            for await (event, session) in client.auth.authStateChanges {
                guard let self else { return }
                switch event {
                case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                    if let user = session?.user, !(session?.isExpired ?? true) {
                        self.identityProviders = Set((user.identities ?? []).map(\.provider))
                        await self.didSignIn(userID: user.id.uuidString.lowercased())
                    } else {
                        self.didSignOut()
                    }
                case .signedOut:
                    self.didSignOut()
                default:
                    break
                }
            }
        }
    }

    private func didSignIn(userID id: String) async {
        let changed = userID != id
        userID = id
        if changed || profile == nil { await refreshProfile() }
    }

    private func didSignOut() {
        userID = nil
        identityProviders = []
        profile = nil
        phase = .signedOut
    }

    // MARK: Sign in with Apple

    /// Configures the Apple request. The nonce is hashed for Apple and kept raw
    /// for Supabase, which checks one against the other to stop replays.
    func prepare(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = Self.randomNonce()
        rawNonce = nonce
        request.requestedScopes = [.fullName]
        request.nonce = Self.sha256(nonce)
    }

    func handle(_ result: Result<ASAuthorization, Error>) async {
        errorMessage = nil
        switch result {
        case let .failure(error):
            // Backing out of the Apple sheet isn't an error worth showing.
            if (error as? ASAuthorizationError)?.code != .canceled {
                errorMessage = "Sign in with Apple didn't complete. Please try again."
            }
        case let .success(authorization):
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let idToken = String(data: tokenData, encoding: .utf8),
                let nonce = rawNonce,
                let client = Backend.client
            else {
                errorMessage = "Apple didn't return a sign-in token. Please try again."
                return
            }
            if let name = credential.fullName {
                let formatted = PersonNameComponentsFormatter().string(from: name)
                pendingFullName = formatted.isEmpty ? nil : formatted
            }
            isWorking = true
            defer { isWorking = false }
            do {
                try await client.auth.signInWithIdToken(
                    credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce)
                )
            } catch {
                errorMessage = "Couldn't sign you in: \(error.localizedDescription)"
            }
            rawNonce = nil
        }
    }

    /// Signs in with Google through the system browser sheet. Uses the same
    /// Google setup as the website, so existing web accounts and their stats
    /// carry over.
    func signInWithGoogle() async {
        guard let client = Backend.client else { return }
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }
        do {
            try await client.auth.signInWithOAuth(
                provider: .google,
                redirectTo: Self.oauthCallback,
                queryParams: [(name: "prompt", value: "select_account")]
            )
        } catch {
            // Closing the sheet isn't an error worth showing.
            if (error as? ASWebAuthenticationSessionError)?.code != .canceledLogin {
                errorMessage = "Couldn't sign you in with Google. Please try again."
            }
        }
    }

    /// Finishes a sign-in whose redirect reached the app as a plain URL.
    func handleCallback(_ url: URL) async {
        guard url.scheme == Self.oauthCallback.scheme, url.host() == Self.oauthCallback.host() else { return }
        _ = try? await Backend.client?.auth.session(from: url)
    }

    func signOut() async {
        guard let client = Backend.client else { return }
        try? await client.auth.signOut()
        didSignOut()
    }

    // MARK: Profile

    func refreshProfile() async {
        guard let client = Backend.client, let userID else { return }
        do {
            let rows: [Profile] = try await client.from("profiles")
                .select()
                .eq("id", value: userID)
                .limit(1)
                .execute()
                .value
            // The row is created by a database trigger at first sign-in; if it
            // isn't visible yet the next refresh will pick it up.
            guard var loaded = rows.first else { return }

            // Apple only shares the name on the very first authorization.
            if loaded.displayName == nil, let name = pendingFullName {
                _ = try? await client.from("profiles").update(["display_name": name]).eq("id", value: userID).execute()
                loaded.displayName = name
            }
            pendingFullName = nil
            profile = loaded
            phase = loaded.needsUsername ? .needsUsername : .ready
        } catch {
            errorMessage = "Couldn't load your profile."
        }
    }

    /// Availability check used while typing. Fails closed, like the web app.
    func isUsernameAvailable(_ username: String) async -> Bool {
        guard let client = Backend.client else { return false }
        let available: Bool? = try? await client
            .rpc("check_username_available", params: ["desired_username": username])
            .execute()
            .value
        return available ?? false
    }

    /// Returns an error message, or nil on success.
    func setUsername(_ username: String) async -> String? {
        guard let client = Backend.client else { return "No backend connection." }
        guard UsernameRules.isValid(username) else { return UsernameRules.requirement }
        do {
            let updated: Profile = try await client
                .rpc("set_username", params: ["desired_username": username])
                .execute()
                .value
            profile = updated
            phase = updated.needsUsername ? .needsUsername : .ready
            return nil
        } catch {
            return "That username isn't available."
        }
    }

    /// Permanently deletes the account and its data (App Store guideline 5.1.1(v)).
    ///
    /// `authorizationCode` comes from a fresh Sign in with Apple the caller just
    /// asked for; the server uses it to revoke the app's access in the player's
    /// Apple Account. Returns an error message, or nil on success.
    func deleteAccount(authorizationCode: String?) async -> String? {
        guard let client = Backend.client else { return "No backend connection." }
        isWorking = true
        defer { isWorking = false }
        do {
            try await client.functions.invoke(
                "delete-account",
                options: FunctionInvokeOptions(body: DeleteBody(authorizationCode: authorizationCode))
            )
            try? await client.auth.signOut()
            didSignOut()
            return nil
        } catch {
            return "Couldn't delete your account. Please try again, or contact support."
        }
    }

    private nonisolated struct DeleteBody: Encodable { let authorizationCode: String? }

    // MARK: Nonce helpers

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        precondition(SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess)
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
