import SwiftUI
import TwistedTacKit

/// Tap-in version of the secret code (the web's SecretCodeDialog), for people
/// who can't or don't want to swipe. Opened by long-pressing the title.
struct SecretCodeSheet: View {
    @Environment(SecretSizes.self) private var secrets
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                Text("Enter the hidden sequence to unlock the larger boards.")
                    .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center)

                HStack(spacing: 6) {
                    ForEach(0..<KonamiTracker.sequence.count, id: \.self) { index in
                        Circle()
                            .strokeBorder(Theme.playerX, lineWidth: 1.5)
                            .background(Circle().fill(index < secrets.progress ? Theme.playerX : .clear))
                            .frame(width: 10, height: 10)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(secrets.progress) of 10 steps entered")

                GlassEffectContainer(spacing: 10) {
                    Grid(horizontalSpacing: 10, verticalSpacing: 10) {
                        GridRow { Color.clear.frame(width: 1, height: 1); pad(.up, "chevron.up"); Color.clear.frame(width: 1, height: 1) }
                        GridRow { pad(.left, "chevron.left"); pad(.down, "chevron.down"); pad(.right, "chevron.right") }
                    }
                }

                HStack(spacing: 12) {
                    letter(.b, "B")
                    letter(.a, "A")
                }

                if secrets.unlocked {
                    Label("Secret sizes unlocked — 1×1 through 8×8", systemImage: "sparkles")
                        .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.playerO)
                }
                Spacer()
            }
            .padding(24)
            .navigationTitle("Secret input")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Reset") { secrets.resetCode() } }
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .presentationDetents([.medium])
        .onChange(of: secrets.unlocked) { _, unlocked in if unlocked { dismiss() } }
    }

    private func pad(_ step: KonamiStep, _ symbol: String) -> some View {
        Button { secrets.enter(step) } label: {
            Image(systemName: symbol).font(.title2.weight(.bold)).frame(width: 56, height: 56)
        }
        .buttonStyle(.glass)
        .accessibilityLabel(step.rawValue.capitalized)
    }

    private func letter(_ step: KonamiStep, _ text: String) -> some View {
        Button { secrets.enter(step) } label: {
            Text(text).font(.title2.weight(.black)).frame(width: 72, height: 48)
        }
        .buttonStyle(.glass)
    }
}
