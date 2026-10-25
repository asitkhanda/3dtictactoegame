import RealityKit
import SwiftUI
import TwistedTacKit
import UIKit

/// Tags a tappable tile with the cell it stands for.
struct CellComponent: Component {
    var index: Int
}

/// Owns the RealityKit entity tree for one game and keeps it in step with the
/// game state. SwiftUI never rebuilds the scene; it only calls `sync`.
@MainActor
final class BoardSceneController {
    private let config: GameRulesConfig
    private let layout: BoardLayout

    /// Everything the board shows lives under `pivot`, which carries the
    /// orbit rotation and zoom.
    let pivot = Entity()
    private var tiles: [Entity] = []
    private var tileModels: [ModelEntity] = []
    private var backings: [ModelEntity] = []
    private var frames: [[ModelEntity]] = []
    private var pieces: [Int: Entity] = [:]
    private var pieceMarks: [Int: Player] = [:]
    private var lastLayerWinners: [Player?]
    private var lastTranslucency: Double = -1
    private var lastAppliedOwners: [Player?] = []

    private let xMesh: MeshResource
    private let oMesh: MeshResource
    private let tileMesh: MeshResource
    private let backingMesh: MeshResource

    init(config: GameRulesConfig) {
        self.config = config
        layout = BoardLayout(config: config)
        lastLayerWinners = Array(repeating: nil, count: config.layerCount)

        xMesh = .generateBox(size: [0.66, 0.15, 0.15], cornerRadius: 0.06)
        oMesh = Self.torus(major: 0.25, minor: 0.08)
        tileMesh = .generateBox(size: [1, 1, 0.06], cornerRadius: 0.12)
        let margin: Float = 0.3
        backingMesh = .generateBox(size: [layout.width + margin * 2, layout.width + margin * 2, 0.02], cornerRadius: 0.2)

        buildScene()
    }

    // MARK: Install

    func install(in content: inout RealityViewCameraContent) {
        content.camera = .virtual

        let camera = Entity()
        camera.components.set(PerspectiveCameraComponent(near: 0.05, far: 50, fieldOfViewInDegrees: 40))
        camera.position = [0, 0, Self.cameraDistance]
        content.add(camera)

        let key = Entity()
        key.components.set(DirectionalLightComponent(color: .white, intensity: 2600))
        key.look(at: .zero, from: [1.4, 2.2, 3], relativeTo: nil)
        content.add(key)

        let fill = Entity()
        fill.components.set(PointLightComponent(color: UIColor(red: 0.6, green: 0.8, blue: 1, alpha: 1), intensity: 900, attenuationRadius: 12))
        fill.position = [-2.5, -1, 2.5]
        content.add(fill)

        content.add(pivot)
    }

    static let cameraDistance: Float = 3

    // MARK: Pose

    func setPose(yaw: Double, pitch: Double, zoom: Double, aspect: CGFloat) {
        let orientation = simd_quatf(angle: Float(pitch) * .pi / 180, axis: [1, 0, 0])
            * simd_quatf(angle: Float(yaw) * .pi / 180, axis: [0, 1, 0])
        pivot.orientation = config.is3D ? orientation : simd_quatf(angle: 0, axis: [0, 1, 0])

        // Fit the board's bounding sphere inside the visible frustum.
        let halfHeight = Self.cameraDistance * tan(40 * .pi / 360)
        let halfWidth = halfHeight * Float(aspect)
        // The 1x1 void is a single tile; keep it from swallowing the screen.
        let fitRadius = min(halfHeight, halfWidth) * (config.size == 1 ? 0.5 : 0.88)
        let fit = fitRadius / layout.radius
        let scale = fit * Float(zoom)
        pivot.scale = SIMD3(repeating: scale)
    }

    // MARK: Sync

    func sync(state: GameState, lastMove: Int?, winningLine: [Int]?, playable: Bool, translucency: Double) {
        syncPieces(state: state, lastMove: lastMove, winningLine: winningLine)
        syncLayers(state: state, playable: playable)
        if translucency != lastTranslucency {
            lastTranslucency = translucency
            applyTranslucency(translucency, state: state)
        }
    }

    private func syncPieces(state: GameState, lastMove: Int?, winningLine: [Int]?) {
        let winning = Set(winningLine ?? [])
        for index in 0..<config.cellCount {
            let mark = state.board[index]
            if pieceMarks[index] != mark {
                pieces[index]?.removeFromParent()
                pieces[index] = nil
                pieceMarks[index] = nil
                if let mark {
                    let piece = makePiece(mark)
                    piece.position = layout.position(forCell: index) + [0, 0, 0.06]
                    pivot.addChild(piece)
                    pieces[index] = piece
                    pieceMarks[index] = mark
                    animateIn(piece)
                }
            }

            guard let piece = pieces[index], let mark = pieceMarks[index] else { continue }
            let emphasized = index == lastMove || winning.contains(index)
            setGlow(piece, mark: mark, emphasized: emphasized, dimmed: !winning.isEmpty && !winning.contains(index))
        }
    }

    private func syncLayers(state: GameState, playable: Bool) {
        for layer in 0..<config.layerCount {
            let owner = state.layerWinners[layer].winner
            let claimedChanged = owner != lastLayerWinners[layer]
            if claimedChanged {
                lastLayerWinners[layer] = owner
                let tint: UIColor = owner.map { UIColor(Theme.color(for: $0)) } ?? UIColor(white: 1, alpha: 0.45)
                for edge in frames[layer] {
                    edge.model?.materials = [UnlitMaterial(color: tint)]
                }
            }
            for local in 0..<config.cellsPerLayer {
                let index = layer * config.cellsPerLayer + local
                let tile = tiles[index]
                let canTap = playable && owner == nil && state.board[index] == nil
                let hasTarget = tile.components.has(InputTargetComponent.self)
                if canTap && !hasTarget {
                    tile.components.set(InputTargetComponent())
                } else if !canTap && hasTarget {
                    tile.components.remove(InputTargetComponent.self)
                }
            }
        }
        if state.layerWinners.map(\.winner) != lastAppliedOwners {
            lastAppliedOwners = state.layerWinners.map(\.winner)
            applyTranslucency(max(lastTranslucency, 0), state: state)
        }
    }

    private func applyTranslucency(_ value: Double, state: GameState) {
        let t = Float(max(0, min(1, value)))
        for layer in 0..<config.layerCount {
            let owner = state.layerWinners[layer].winner
            let base: UIColor = owner.map { UIColor(Theme.color(for: $0)) } ?? .white
            let backingAlpha = (owner == nil ? 0.03 : 0.10) + 0.14 * CGFloat(t)
            let tileAlpha = (owner == nil ? 0.07 : 0.05) + 0.26 * CGFloat(t)
            backings[layer].model?.materials = [Self.glass(base, alpha: backingAlpha)]
            for local in 0..<config.cellsPerLayer {
                let index = layer * config.cellsPerLayer + local
                tileModels[index].model?.materials = [Self.glass(owner == nil ? .white : base, alpha: tileAlpha)]
            }
        }
    }

    // MARK: Build

    private func buildScene() {
        for layer in 0..<config.layerCount {
            let z = layout.position(x: 0, y: 0, layer: layer).z

            let backing = ModelEntity(mesh: backingMesh, materials: [Self.glass(.white, alpha: 0.1)])
            backing.position = [0, 0, z - 0.05]
            pivot.addChild(backing)
            backings.append(backing)

            frames.append(makeFrame(layer: layer, z: z))

            for local in 0..<config.cellsPerLayer {
                let index = layer * config.cellsPerLayer + local
                let tile = ModelEntity(mesh: tileMesh, materials: [Self.glass(.white, alpha: 0.18)])
                tile.position = layout.position(forCell: index)
                tile.components.set(CellComponent(index: index))
                tile.components.set(CollisionComponent(shapes: [.generateBox(size: [1, 1, 0.5])]))
                tile.components.set(InputTargetComponent())
                pivot.addChild(tile)
                tiles.append(tile)
                tileModels.append(tile)
            }
        }
    }

    private func makeFrame(layer: Int, z: Float) -> [ModelEntity] {
        let half = layout.width / 2 + 0.3
        let thickness: Float = 0.05
        let length = half * 2 + thickness
        let material = UnlitMaterial(color: UIColor(white: 1, alpha: 0.45))
        let specs: [(SIMD3<Float>, SIMD3<Float>)] = [
            ([length, thickness, thickness], [0, half, z]),
            ([length, thickness, thickness], [0, -half, z]),
            ([thickness, length, thickness], [-half, 0, z]),
            ([thickness, length, thickness], [half, 0, z]),
        ]
        return specs.map { size, position in
            let edge = ModelEntity(mesh: .generateBox(size: size, cornerRadius: thickness / 2), materials: [material])
            edge.position = position
            pivot.addChild(edge)
            return edge
        }
    }

    // MARK: Pieces

    private func makePiece(_ mark: Player) -> Entity {
        let piece = Entity()
        switch mark {
        case .x:
            for angle in [Float.pi / 4, -Float.pi / 4] {
                let bar = ModelEntity(mesh: xMesh, materials: [Self.pieceMaterial(for: .x, emphasized: false)])
                bar.orientation = simd_quatf(angle: angle, axis: [0, 0, 1])
                piece.addChild(bar)
            }
        case .o:
            piece.addChild(ModelEntity(mesh: oMesh, materials: [Self.pieceMaterial(for: .o, emphasized: false)]))
        }
        return piece
    }

    private func setGlow(_ piece: Entity, mark: Player, emphasized: Bool, dimmed: Bool) {
        for child in piece.children {
            (child as? ModelEntity)?.model?.materials = [Self.pieceMaterial(for: mark, emphasized: emphasized)]
        }
        piece.components.set(OpacityComponent(opacity: dimmed ? 0.35 : 1))
    }

    private func animateIn(_ piece: Entity) {
        let target = piece.transform
        piece.transform.scale = SIMD3(repeating: 0.01)
        piece.move(to: target, relativeTo: piece.parent, duration: 0.2, timingFunction: .easeOut)
    }

    // MARK: Materials and meshes

    private static func glass(_ color: UIColor, alpha: CGFloat) -> UnlitMaterial {
        var material = UnlitMaterial(color: color.withAlphaComponent(alpha))
        material.blending = .transparent(opacity: .init(floatLiteral: Float(alpha)))
        return material
    }

    private static func pieceMaterial(for mark: Player, emphasized: Bool) -> PhysicallyBasedMaterial {
        let base = UIColor(mark == .x ? Theme.playerX : Theme.playerO)
        let bright = UIColor(mark == .x ? Theme.playerXLight : Theme.playerOLight)
        var material = PhysicallyBasedMaterial()
        material.baseColor = .init(tint: emphasized ? bright : base)
        material.emissiveColor = .init(color: emphasized ? bright : base)
        material.emissiveIntensity = emphasized ? 1.4 : 0.55
        material.roughness = .init(floatLiteral: 0.35)
        material.metallic = .init(floatLiteral: 0.1)
        material.faceCulling = .none
        return material
    }

    private static func torus(major: Float, minor: Float, segments: Int = 40, sides: Int = 16) -> MeshResource {
        var positions: [SIMD3<Float>] = []
        var normals: [SIMD3<Float>] = []
        var indices: [UInt32] = []
        for i in 0...segments {
            let u = Float(i) / Float(segments) * 2 * .pi
            for j in 0...sides {
                let v = Float(j) / Float(sides) * 2 * .pi
                let ring = major + minor * cos(v)
                positions.append([ring * cos(u), ring * sin(u), minor * sin(v)])
                normals.append([cos(v) * cos(u), cos(v) * sin(u), sin(v)])
            }
        }
        for i in 0..<segments {
            for j in 0..<sides {
                let a = UInt32(i * (sides + 1) + j)
                let b = a + UInt32(sides + 1)
                indices += [a, a + 1, b, a + 1, b + 1, b]
            }
        }
        var descriptor = MeshDescriptor(name: "torus")
        descriptor.positions = MeshBuffer(positions)
        descriptor.normals = MeshBuffer(normals)
        descriptor.primitives = .triangles(indices)
        return (try? MeshResource.generate(from: [descriptor])) ?? .generateSphere(radius: major)
    }
}
