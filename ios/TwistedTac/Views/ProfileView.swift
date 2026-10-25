import SwiftUI
import TwistedTacKit

struct ProfileView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var confirmDelete = false
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
            Button("Delete account", role: .destructive) {
                Task {
                    deleteError = await auth.deleteAccount()
                    if deleteError == nil { dismiss() }
                }
            }
            Button("Keep my account", role: .cancel) {}
        } message: {
            Text("This permanently deletes your profile, stats and match history. It can't be undone.")
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
