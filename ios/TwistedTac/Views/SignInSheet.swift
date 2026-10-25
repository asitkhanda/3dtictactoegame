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
                Text("Sign in to play ranked matches, track your wins and climb the leaderboard. Already play on the website with Google? Use Google here to keep your stats. Local games never need an account.")
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

                    // Apple's guidelines want Sign in with Apple at least as prominent
                    // as any other login, so it stays first and the same size.
                    Button { Task { await auth.signInWithGoogle() } } label: {
                        HStack(spacing: 10) {
                            GoogleMark().frame(width: 20, height: 20)
                            Text("Continue with Google").font(.system(size: 19, weight: .medium))
                        }
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .foregroundStyle(.black)
                        .background(.white, in: .capsule)
                    }
                    .buttonStyle(.plain)
                    .disabled(auth.isWorking)
                    .accessibilityLabel("Continue with Google")

                    if auth.isWorking { ProgressView() }
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

/// A simple four-colour "G". Swap in Google's official asset before launch if
/// you want pixel-exact branding.
struct GoogleMark: View {
    var body: some View {
        Text("G")
            .font(.system(size: 20, weight: .bold, design: .rounded))
            .foregroundStyle(
                AngularGradient(
                    colors: [
                        Color(red: 0.26, green: 0.52, blue: 0.96),  // blue
                        Color(red: 0.20, green: 0.66, blue: 0.33),  // green
                        Color(red: 0.98, green: 0.74, blue: 0.02),  // yellow
                        Color(red: 0.92, green: 0.26, blue: 0.21),  // red
                        Color(red: 0.26, green: 0.52, blue: 0.96),
                    ],
                    center: .center,
                    startAngle: .degrees(-30),
                    endAngle: .degrees(330)
                )
            )
            .accessibilityHidden(true)
    }
}
