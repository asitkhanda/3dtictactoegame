import AuthenticationServices
import SwiftUI
import TwistedTacKit

struct ProfileView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var confirmDelete = false
    @State private var reauthenticate = false
    @State private var deleteError: String?

    var body: some View {
        ZStack {
            Theme.background
            ScrollView {
                if let profile = auth.profile {
                    VStack(spacing: 20) {
                        header(profile)
                        stats(profile)
                        actions
                        if let deleteError {
                            Text(deleteError).font(.footnote).foregroundStyle(Theme.playerX)
                        }
                        LegalLinks().padding(.top, 8)
                    }
                    .padding(20)
                } else {
                    ProgressView().padding(.top, 80)
                }
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .task { await auth.refreshProfile() }
        .confirmationDialog(
            "Delete your account?",
            isPresented: $confirmDelete,
            titleVisibility: .visible
        ) {
            Button("Continue", role: .destructive) { reauthenticate = true }
            Button("Keep my account", role: .cancel) {}
        } message: {
            Text("This permanently deletes your profile, stats and match history. It can't be undone.")
        }
        // Apple asks apps to confirm with a fresh sign-in, which also lets the
        // server revoke the app's access to the player's Apple Account.
        .sheet(isPresented: $reauthenticate) {
            VStack(spacing: 18) {
                Image(systemName: "trash.circle.fill").font(.system(size: 48)).foregroundStyle(Theme.playerX)
                Text("Confirm with Apple").font(.system(.title2, design: .rounded, weight: .black))
                Text("Sign in once more to confirm. Your account and data will be deleted right away.")
                    .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                SignInWithAppleButton(.continue) { request in
                    request.requestedScopes = []
                } onCompletion: { result in
                    reauthenticate = false
                    Task { await finishDeletion(result) }
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 54)
                .clipShape(.capsule)
                Button("Cancel", role: .cancel) { reauthenticate = false }
            }
            .padding(24)
            .presentationDetents([.fraction(0.5)])
        }
    }

    private func finishDeletion(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case let .success(authorization):
            let code = (authorization.credential as? ASAuthorizationAppleIDCredential)?
                .authorizationCode.flatMap { String(data: $0, encoding: .utf8) }
            deleteError = await auth.deleteAccount(authorizationCode: code)
            if deleteError == nil { dismiss() }
        case let .failure(error):
            if (error as? ASAuthorizationError)?.code != .canceled {
                deleteError = "Couldn't confirm with Apple. Please try again."
            }
        }
    }

    private func header(_ profile: Profile) -> some View {
        VStack(spacing: 10) {
            AvatarView(urlString: profile.avatarURL, name: profile.username ?? "?", size: 88)
            Text(profile.username ?? "—")
                .font(.system(.title, design: .rounded, weight: .black))
            if let displayName = profile.displayName, !displayName.isEmpty {
                Text(displayName).font(.subheadline).foregroundStyle(Theme.muted)
            }
        }
    }

    private func stats(_ profile: Profile) -> some View {
        GlassEffectContainer(spacing: 10) {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                stat("Points", "\(profile.points)", tint: Theme.playerO)
                stat("Wins", "\(profile.wins)", tint: Theme.playerX)
                stat("Losses", "\(profile.losses)")
                stat("Draws", "\(profile.draws)")
                stat("Played", "\(profile.gamesPlayed)")
                stat("Win rate", profile.winRate.map { "\(Int(($0 * 100).rounded()))%" } ?? "—")
            }
        }
    }

    private func stat(_ title: String, _ value: String, tint: Color? = nil) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(.title2, design: .rounded, weight: .black)).minimumScaleFactor(0.6)
            Text(title).font(.caption).foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .glassEffect(.regular.tint((tint ?? .clear).opacity(0.2)), in: .rect(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }

    private var actions: some View {
        GlassEffectContainer(spacing: 10) {
            VStack(spacing: 10) {
                Button { Task { await auth.signOut(); dismiss() } } label: {
                    Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right").frame(maxWidth: .infinity)
                }
                .buttonStyle(.glass)
                Button(role: .destructive) { confirmDelete = true } label: {
                    Label("Delete account", systemImage: "trash").frame(maxWidth: .infinity)
                }
                .buttonStyle(.glass)
                .disabled(auth.isWorking)
            }
            .controlSize(.large)
        }
    }
}
