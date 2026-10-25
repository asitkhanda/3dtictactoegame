import simd
import TwistedTacKit

/// Board geometry in "cell widths" (one cell is 1 unit wide). Proportions
/// come from VISUAL_CELL_SCALES in src/utils/gameConfig.ts so big boards get
/// tighter spacing, as on the web.
struct BoardLayout {
    let size: Int
    let is3D: Bool
    let gap: Float
    let layerSpacing: Float

    private struct Scale { let cellPx: Float; let layerSpacingPx: Float; let gapPx: Float }

    private static let scales: [Int: Scale] = [
        1: Scale(cellPx: 120, layerSpacingPx: 80, gapPx: 0),
        2: Scale(cellPx: 80, layerSpacingPx: 100, gapPx: 8),
        3: Scale(cellPx: 80, layerSpacingPx: 160, gapPx: 12),
        4: Scale(cellPx: 68, layerSpacingPx: 112, gapPx: 10),
        5: Scale(cellPx: 54, layerSpacingPx: 100, gapPx: 8),
        6: Scale(cellPx: 44, layerSpacingPx: 88, gapPx: 6),
        7: Scale(cellPx: 38, layerSpacingPx: 76, gapPx: 5),
        8: Scale(cellPx: 34, layerSpacingPx: 64, gapPx: 4),
    ]

    init(config: GameRulesConfig) {
        size = config.size
        is3D = config.is3D
        let scale = Self.scales[config.size]!
        gap = scale.gapPx / scale.cellPx
        layerSpacing = scale.layerSpacingPx / scale.cellPx
    }

    var pitch: Float { 1 + gap }
    var width: Float { Float(size) + Float(size - 1) * gap }
    var depth: Float { is3D ? Float(size - 1) * layerSpacing : 0 }
    /// Radius of the sphere that encloses the whole board, for camera fitting.
    var radius: Float { 0.5 * (width * width * 2 + depth * depth).squareRoot() }

    /// Row 0 sits at the top; layer 0 is nearest the viewer.
    func position(x: Int, y: Int, layer: Int) -> SIMD3<Float> {
        let center = Float(size - 1) / 2
        return SIMD3(
            (Float(x) - center) * pitch,
            (center - Float(y)) * pitch,
            is3D ? (center - Float(layer)) * layerSpacing : 0
        )
    }

    func position(forCell index: Int) -> SIMD3<Float> {
        let perLayer = size * size
        let layer = is3D ? index / perLayer : 0
        let within = index % perLayer
        return position(x: within % size, y: within / size, layer: layer)
    }
}
