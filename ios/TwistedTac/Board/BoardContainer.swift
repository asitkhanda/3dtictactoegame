import SwiftUI
import TwistedTacKit

/// The board people actually see. A 3D scene can't be read by VoiceOver or
/// driven by Switch Control, so when either is on, the same game is shown as
/// labelled buttons, layer by layer.
struct BoardContainer<Game: BoardGameSource>: View {
    let model: Game
    let viewport: BoardViewport

    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
    @Environment(\.accessibilitySwitchControlEnabled) private var switchControl
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    #if DEBUG
    /// `-forceAccessibleBoard YES` previews the VoiceOver layout without VoiceOver.
    private static var forceAccessible: Bool { UserDefaults.standard.bool(forKey: "forceAccessibleBoard") }
    #else
    private static var forceAccessible: Bool { false }
    #endif

    var body: some View {
        Group {
            if voiceOver || switchControl || Self.forceAccessible {
                AccessibleBoardView(model: model)
            } else {
                BoardView(model: model, viewport: viewport)
            }
        }
        .onAppear { viewport.reduceMotion = reduceMotion }
        .onChange(of: reduceMotion) { _, value in viewport.reduceMotion = value }
        .onChange(of: model.lastMove) { _, move in
            guard let move else { return }
            let mark = model.state.board[move].map { $0.rawValue } ?? "Mark"
            AccessibilityNotification.Announcement("\(mark) placed, \(AccessibleBoardView<Game>.describe(cell: move, config: model.config))").post()
        }
    }
}

/// Every cell as a button, grouped by layer, with spoken positions.
struct AccessibleBoardView<Game: BoardGameSource>: View {
    let model: Game

    var body: some View {
        let config = model.config
        let state = model.state
        ScrollView {
            VStack(spacing: 18) {
                ForEach(0..<config.layerCount, id: \.self) { layer in
                    let owner = state.layerWinners[layer].winner
                    VStack(alignment: .leading, spacing: 8) {
                        if config.is3D {
                            Text("Layer \(layer + 1)\(owner.map { " — claimed by \($0.rawValue)" } ?? "")")
                                .font(.headline)
                                .accessibilityAddTraits(.isHeader)
                        }
                        Grid(horizontalSpacing: 6, verticalSpacing: 6) {
                            ForEach(0..<config.size, id: \.self) { row in
                                GridRow {
                                    ForEach(0..<config.size, id: \.self) { column in
                                        let index = layer * config.cellsPerLayer + row * config.size + column
                                        cell(index, locked: owner != nil)
                                    }
                                }
                            }
                        }
                    }
                    .padding(12)
                    .glassEffect(.regular, in: .rect(cornerRadius: 18))
                }
            }
            .padding(16)
        }
    }

    private func cell(_ index: Int, locked: Bool) -> some View {
        let mark = model.state.board[index]
        return Button { model.humanTap(index) } label: {
            Group {
                if let mark { MarkGlyph(player: mark, size: 22) } else { Color.clear }
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(.white.opacity(mark == nil ? 0.08 : 0.04), in: .rect(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .disabled(mark != nil || locked || !model.acceptsInput)
        .accessibilityLabel(Self.describe(cell: index, config: model.config) + ", " + (mark.map { "\($0.rawValue)" } ?? "empty"))
        .accessibilityHint(mark == nil && !locked ? "Double tap to place your mark" : "")
    }

    /// "layer 2, row 1, column 3" (layer omitted on flat boards).
    static func describe(cell index: Int, config: GameRulesConfig) -> String {
        let layer = index / config.cellsPerLayer
        let within = index % config.cellsPerLayer
        let place = "row \(within / config.size + 1), column \(within % config.size + 1)"
        return config.is3D ? "layer \(layer + 1), \(place)" : place
    }
}
