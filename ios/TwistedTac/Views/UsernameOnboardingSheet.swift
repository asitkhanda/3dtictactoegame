import SwiftUI
import TwistedTacKit

/// Shown after the first sign-in until a username is chosen. Mirrors
/// UsernameOnboardingModal.tsx: live availability check, then submit.
struct UsernameOnboardingSheet: View {
    @Environment(AuthManager.self) private var auth

    @State private var username = ""
    @State private var availability: Availability = .unknown
    @State private var submitting = false
    @State private var error: String?
    @FocusState private var focused: Bool

    private enum Availability { case unknown, checking, available, taken }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                Text("Pick your username")
                    .font(.system(.title, design: .rounded, weight: .black))
                Text("Required to compete online and appear on the leaderboard.")
                    .font(.callout).foregroundStyle(Theme.muted)

                HStack {
                    TextField("username", text: $username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textContentType(.username)
                        .focused($focused)
                        .submitLabel(.done)
                        .onSubmit { Task { await submit() } }
                    statusIcon
                }
                .padding(.horizontal, 16).padding(.vertical, 14)
                .glassEffect(.regular, in: .rect(cornerRadius: 16))

                Text(hint).font(.footnote).foregroundStyle(hintColor)

                Button { Task { await submit() } } label: {
                    Group {
                        if submitting { ProgressView() } else { Text("Continue").font(.headline) }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.glassProminent)
                .tint(Theme.playerX)
                .controlSize(.large)
                .disabled(!canSubmit)

                Spacer()

                Button("Sign out", role: .destructive) { Task { await auth.signOut() } }
                    .font(.footnote)
                    .frame(maxWidth: .infinity)
            }
            .padding(24)
        }
        .interactiveDismissDisabled()
        .presentationDetents([.large])
        .onAppear { focused = true }
        .task(id: username) { await checkAvailability() }
    }

    // MARK: Pieces

    @ViewBuilder
    private var statusIcon: some View {
        switch availability {
        case .checking: ProgressView()
        case .available: Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.playerO)
        case .taken: Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.playerX)
        case .unknown: EmptyView()
        }
    }

    private var hint: String {
        if let error { return error }
        if username.isEmpty { return UsernameRules.requirement }
        if !UsernameRules.isValid(username) { return UsernameRules.requirement }
        switch availability {
        case .taken: return "That username is taken."
        case .available: return "Looks good."
        default: return "Checking…"
        }
    }

    private var hintColor: Color {
        if error != nil || availability == .taken { return Theme.playerX }
        return availability == .available ? Theme.playerO : Theme.muted
    }

    private var canSubmit: Bool {
        UsernameRules.isValid(username) && availability != .taken && !submitting
    }

    // MARK: Actions

    private func checkAvailability() async {
        error = nil
        guard UsernameRules.isValid(username) else {
            availability = .unknown
            return
        }
        availability = .checking
        // Debounce typing; .task(id:) cancels this when the text changes.
        try? await Task.sleep(for: .milliseconds(400))
        if Task.isCancelled { return }
        let ok = await auth.isUsernameAvailable(username)
        if Task.isCancelled { return }
        availability = ok ? .available : .taken
    }

    private func submit() async {
        guard canSubmit else {
            if !UsernameRules.isValid(username) { error = UsernameRules.requirement }
            return
        }
        submitting = true
        error = await auth.setUsername(username)
        submitting = false
    }
}
