import RealityKit
import SwiftUI
import TwistedTacKit

/// The 3D board. Renders `model` through a RealityKit scene and turns taps on
/// tiles into moves. Drag orbits, pinch zooms.
struct BoardView<Game: BoardGameSource>: View {
    let model: Game
    let viewport: BoardViewport

    @State private var controller: BoardSceneController?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Everything the scene shows. RealityView's `update` closure doesn't
    /// reliably re-run for @Observable changes, so the view reads these in its
    /// body and pushes changes to the scene from `onChange`.
    private struct SyncToken: Equatable {
        var state: GameState
        var lastMove: Int?
        var winningLine: [Int]?
        var playable: Bool
        var yaw: Double
        var pitch: Double
        var zoom: Double
        var translucency: Double
        var aspect: CGFloat
    }

    private func token(aspect: CGFloat) -> SyncToken {
        SyncToken(
            state: model.state,
            lastMove: model.lastMove,
            winningLine: model.winningLine,
            playable: model.acceptsInput,
            yaw: viewport.yaw,
            pitch: viewport.pitch,
            zoom: viewport.zoom,
            translucency: viewport.translucency,
            aspect: aspect
        )
    }

    var body: some View {
        GeometryReader { geometry in
            let aspect = geometry.size.height > 0 ? geometry.size.width / geometry.size.height : 1
            RealityView { content in
                let controller = BoardSceneController(config: model.config)
                controller.install(in: &content)
                // `update` only re-runs when observed state changes, so the
                // first frame has to be posed and synced here.
                apply(to: controller, aspect: aspect)
                self.controller = controller
            }
            .onChange(of: token(aspect: aspect)) { _, _ in
                guard let controller else { return }
                apply(to: controller, aspect: aspect)
            }
            .gesture(
                SpatialTapGesture()
                    .targetedToAnyEntity()
                    .onEnded { value in
                        if let index = cellIndex(of: value.entity) { model.humanTap(index) }
                    }
            )
            .gesture(
                DragGesture(minimumDistance: 8)
                    .onChanged { value in
                        if model.config.is3D {
                            if value.translation == .zero { return }
                            viewport.dragStartIfNeeded()
                            viewport.drag(translation: value.translation)
                        }
                    }
                    .onEnded { _ in viewport.endDrag() }
            )
            .simultaneousGesture(
                MagnifyGesture()
                    .onChanged { value in
                        viewport.beginMagnifyIfNeeded()
                        viewport.magnify(scale: value.magnification)
                    }
                    .onEnded { _ in viewport.endMagnify() }
            )
        }
        .accessibilityElement()
        .accessibilityLabel("Game board, \(model.config.size) by \(model.config.size)\(model.config.is3D ? " by \(model.config.size)" : "")")
    }

    private func apply(to controller: BoardSceneController, aspect: CGFloat) {
        controller.reduceMotion = reduceMotion
        controller.setPose(yaw: viewport.yaw, pitch: viewport.pitch, zoom: viewport.zoom, aspect: aspect)
        controller.sync(
            state: model.state,
            lastMove: model.lastMove,
            winningLine: model.winningLine,
            playable: model.acceptsInput,
            translucency: viewport.translucency
        )
    }

    private func cellIndex(of entity: Entity) -> Int? {
        var current: Entity? = entity
        while let node = current {
            if let cell = node.components[CellComponent.self] { return cell.index }
            current = node.parent
        }
        return nil
    }
}
