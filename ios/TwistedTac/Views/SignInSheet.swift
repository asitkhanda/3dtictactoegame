import AuthenticationServices
import SwiftUI

/// Explains why to sign in, then offers Sign in with Apple.
struct SignInSheet: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                Image(systemName: "person.crop.circle.badge.checkmark")
                    .font(.system(size: 54))
                    .foregroundStyle(Theme.playerO)
                    .padding(.top, 8)
                Text("Compete online")
                    .font(.system(.title, design: .rounded, weight: .black))
                Text("Sign in to play ranked matches, track your wins and climb the leaderboard. Local games never need an account.")
                    .font(.callout)
                    .foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 8)

                if auth.isConfigured {
                    SignInWithAppleButton(.signIn) { request in
                        auth.prepare(request)
                    } onCompletion: { result in
                        Task { await auth.handle(result) }
                    }
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 54)
                    .clipShape(.capsule)
                    .disabled(auth.isWorking)
                    .overlay { if auth.isWorking { ProgressView() } }
                } else {
                    Text("This build has no backend connection, so sign-in is unavailable.")
                        .font(.footnote).foregroundStyle(Theme.muted)
                }

                if let message = auth.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.playerX)
                        .multilineTextAlignment(.center)
                }

                LegalLinks()
            }
            .padding(24)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
        }
        .presentationDetents([.fraction(0.62), .large])
        .onChange(of: auth.isSignedIn) { _, signedIn in if signedIn { dismiss() } }
    }
}

struct LegalLinks: View {
    var body: some View {
        HStack(spacing: 6) {
            Link("Privacy", destination: URL(string: "https://twistedtac.com/privacy-policy")!)
            Text("·")
            Link("Terms", destination: URL(string: "https://twistedtac.com/terms-of-service")!)
        }
        .font(.footnote)
        .foregroundStyle(Theme.muted)
    }
}
