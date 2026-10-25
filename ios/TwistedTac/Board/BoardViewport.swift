import Foundation
import Observation

/// Camera state for the board: orbit (yaw/pitch), zoom and layer glass.
@Observable
final class BoardViewport {
    static let home = CameraPreset.home

    var yaw: Double = CameraPreset.home.rotation.yaw
    var pitch: Double = CameraPreset.home.rotation.pitch
    var zoom: Double = 1
    /// 0...1 — higher shows the layers more solidly.
    var translucency: Double = 0.5
    private(set) var activePreset: CameraPreset? = .home

    private var animation: Task<Void, Never>?
    private var dragStart: (yaw: Double, pitch: Double)?
    private var zoomStart: Double?

    func dragStartIfNeeded() {
        guard dragStart == nil else { return }
        animation?.cancel()
        dragStart = (yaw, pitch)
        activePreset = nil
    }

    func endDrag() { dragStart = nil }

    func drag(translation: CGSize, sensitivity: Double = 0.4) {
        guard let start = dragStart else { return }
        yaw = start.yaw + Double(translation.width) * sensitivity
        pitch = min(90, max(-90, start.pitch + Double(translation.height) * sensitivity))
    }

    func beginMagnifyIfNeeded() {
        if zoomStart == nil { zoomStart = zoom }
    }

    func endMagnify() { zoomStart = nil }

    func magnify(scale: Double) {
        guard let start = zoomStart else { return }
        zoom = min(3, max(0.5, start * scale))
    }

    func zoomBy(_ factor: Double) {
        zoom = min(3, max(0.5, zoom * factor))
    }

    /// Eases to a preset over 300 ms (PRESET_TRANSITION_MS on the web).
    func go(to preset: CameraPreset) {
        animation?.cancel()
        activePreset = preset
        let target = preset.rotation
        let startYaw = yaw, startPitch = pitch, startZoom = zoom
        // Take the short way around the yaw circle.
        var deltaYaw = (target.yaw - startYaw).truncatingRemainder(dividingBy: 360)
        if deltaYaw > 180 { deltaYaw -= 360 }
        if deltaYaw < -180 { deltaYaw += 360 }

        animation = Task { [weak self] in
            let steps = 18
            for step in 1...steps {
                try? await Task.sleep(for: .milliseconds(300 / steps))
                if Task.isCancelled { return }
                let t = Double(step) / Double(steps)
                let eased = 1 - pow(1 - t, 3)
                self?.yaw = startYaw + deltaYaw * eased
                self?.pitch = startPitch + (target.pitch - startPitch) * eased
                self?.zoom = startZoom + (1 - startZoom) * eased
            }
        }
    }

    func reset() { go(to: .home) }
}
