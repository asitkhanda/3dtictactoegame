import SwiftUI

struct RulesSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    rule("square.3.layers.3d", "Play across layers",
                         "The classic board is a 3×3×3 cube: three stacked 3×3 layers. Rotate it to read lines through depth.")
                    rule("line.3.horizontal", "Claim a layer",
                         "Complete a row, column or diagonal on one layer to claim it. A claimed layer locks. Claim 2 of 3 layers to win the match.")
                    rule("arrow.up.right", "Or strike through the stack",
                         "Connect three marks through depth — straight down the stack or along a space diagonal — and win on the spot.")
                    rule("equal.circle", "Draws",
                         "If no legal moves remain and nobody has won, the game is a draw.")
                    rule("hand.draw", "Controls",
                         "Drag to rotate, pinch to zoom, tap a glowing tile to place your mark.")
                }
                .padding(24)
            }
            .navigationTitle("How to play")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func rule(_ symbol: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.title2)
                .foregroundStyle(Theme.playerO)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(text).font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }
}
