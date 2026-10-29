import SwiftUI
import TwistedTacKit

/// Create a room, join one by code, or resume an unfinished match.
struct OnlineLobbyView: View {
    let size: Int
    let viewMode: ViewMode
    let onNavigate: (Destination) -> Void

    @Environment(AuthManager.self) private var auth

    @State private var code = ""
    @State private var working: Action?
    @State private var errorMessage: String?
    @State private var resumable: MatchRow?
    @FocusState private var codeFocused: Bool

    private enum Action { case create, join, cancel }

    var body: some View {
        ZStack {
            Theme.background
            ScrollView {
                VStack(spacing: 22) {
                    VStack(spacing: 6) {
                        Text("Play online")
                            .font(.system(.largeTitle, design: .rounded, weight: .black))
                        Text("Ranked: wins +25, draws +5, losses −5.")
                            .font(.callout).foregroundStyle(Theme.muted)
                    }
                    .padding(.top, 8)

                    if let resumable { resumeCard(resumable) }

                    GlassEffectContainer(spacing: 14) {
                        VStack(spacing: 14) {
                            createCard
                            joinCard
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage).font(.footnote).foregroundStyle(Theme.playerX)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(20)
                .frame(maxWidth: 480)
            }
        }
        .navigationTitle("Online")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadResumable() }
    }

    // MARK: Cards

    private func resumeCard(_ match: MatchRow) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(match.status == .waiting ? "Open room \(match.roomCode)" : "Active online match")
                    .font(.headline)
                Text(match.status == .waiting ? "Still waiting for an opponent." : "Resume where you left off.")
                    .font(.caption).foregroundStyle(Theme.muted)
            }
            Spacer()
            if match.status == .waiting {
                Button("Cancel", role: .destructive) { Task { await cancel(match) } }
                    .buttonStyle(.glass)
                    .disabled(working != nil)
            }
            Button("Resume") { onNavigate(.online(match)) }
                .buttonStyle(.glassProminent).tint(Theme.playerO)
        }
        .padding(16)
        .glassEffect(.regular.tint(Theme.playerO.opacity(0.2)), in: .rect(cornerRadius: 20))
    }

    private var createCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Create a room", systemImage: "plus.circle.fill").font(.headline)
            Text("Get a 6-character code to share with a friend. Rooms expire after 10 minutes.")
                .font(.footnote).foregroundStyle(Theme.muted)
            Button { Task { await create() } } label: {
                Group {
                    if working == .create { ProgressView() } else { Text("Create room").font(.headline) }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glassProminent).tint(Theme.playerX)
            .controlSize(.large)
            .disabled(working != nil)
        }
        .padding(18)
        .glassEffect(.regular, in: .rect(cornerRadius: 22))
    }

    private var joinCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Join with a code", systemImage: "number.circle.fill").font(.headline)
            TextField("ABC123", text: $code)
                .font(.system(.title2, design: .monospaced, weight: .bold))
                .multilineTextAlignment(.center)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .focused($codeFocused)
                .padding(.vertical, 12)
                .glassEffect(.regular, in: .rect(cornerRadius: 14))
                .onChange(of: code) { _, value in
                    let cleaned = String(value.uppercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber) }.prefix(6))
                    if cleaned != value { code = cleaned }
                }
                .onSubmit { Task { await join() } }
            Button { Task { await join() } } label: {
                Group {
                    if working == .join { ProgressView() } else { Text("Join room").font(.headline) }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glassProminent).tint(Theme.playerO.opacity(0.7))
            .controlSize(.large)
            .disabled(code.count < 6 || working != nil)
        }
        .padding(18)
        .glassEffect(.regular, in: .rect(cornerRadius: 22))
    }

    // MARK: Actions

    private func create() async {
        working = .create
        errorMessage = nil
        defer { working = nil }
        do {
            let match = try await MatchService.createMatch(size: size, viewMode: viewMode)
            ArcadeFeedback.shared.play(.tap)
            onNavigate(.online(match))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func join() async {
        guard code.count == 6 else { return }
        working = .join
        errorMessage = nil
        codeFocused = false
        defer { working = nil }
        do {
            let match = try await MatchService.joinMatch(code: code)
            code = ""
            onNavigate(.online(match))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadResumable() async {
        guard let id = auth.userID else { return }
        let match = await MatchService.activeMatch(for: id)
        // Only an unfinished match is worth offering.
        resumable = match.flatMap { $0.status == .waiting || $0.status == .active ? $0 : nil }
    }

    /// Cancels a room nobody has joined, so it doesn't linger. Nobody loses anything.
    private func cancel(_ match: MatchRow) async {
        working = .cancel
        errorMessage = nil
        defer { working = nil }
        do {
            _ = try await MatchService.forfeit(matchID: match.id)
            resumable = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
