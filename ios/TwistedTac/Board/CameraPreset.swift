import Foundation

/// Camera presets from src/utils/cameraPresets.ts. The web stores CSS
/// rotateX/rotateY degrees; here pitch is the negated rotateX so that a
/// positive pitch tips the top of the board toward the viewer.
enum CameraPreset: String, CaseIterable, Identifiable {
    case top, front, right, back, left, iso, home

    var id: String { rawValue }

    var label: String {
        switch self {
        case .top: "Top view"
        case .front: "Front view"
        case .right: "Right view"
        case .back: "Back view"
        case .left: "Left view"
        case .iso: "Isometric view"
        case .home: "Home view"
        }
    }

    var shortLabel: String {
        switch self {
        case .top: "T"
        case .front: "F"
        case .right: "R"
        case .back: "B"
        case .left: "L"
        case .iso: "I"
        case .home: "⌂"
        }
    }

    /// (pitch, yaw) in degrees.
    var rotation: (pitch: Double, yaw: Double) {
        switch self {
        case .top: (90, 0)
        case .front: (0, 0)
        case .right: (0, 90)
        case .back: (0, 180)
        case .left: (0, -90)
        case .iso: (35, 45)
        case .home: (25, 45)
        }
    }
}
