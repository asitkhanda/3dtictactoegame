import SwiftUI

/// Preset chips (scrollable), zoom buttons and the layer-glass slider.
struct CameraControls: View {
    let viewport: BoardViewport
    let is3D: Bool

    var body: some View {
        VStack(spacing: 10) {
            if is3D {
                GlassEffectContainer(spacing: 6) {
                    HStack(spacing: 6) {
                        ForEach(CameraPreset.allCases) { preset in
                            Button {
                                ArcadeFeedback.shared.play(.tap)
                                viewport.go(to: preset)
                            } label: {
                                Text(preset.shortLabel)
                                    .font(.subheadline.weight(.bold))
                                    .frame(maxWidth: .infinity, minHeight: 24)
                            }
                            .buttonStyle(.glass)
                            .controlSize(.small)
                            .tint(viewport.activePreset == preset ? Theme.playerO : nil)
                            .accessibilityLabel(preset.label)
                        }
                    }
                }
            }
            HStack(spacing: 10) {
                if is3D {
                    Image(systemName: "square.3.layers.3d").foregroundStyle(Theme.muted)
                    Slider(value: Bindable(viewport).translucency, in: 0...1)
                        .tint(Theme.playerO)
                        .accessibilityLabel("Layer opacity")
                } else {
                    Spacer(minLength: 0)
                }
                Button { viewport.zoomBy(1 / 1.25) } label: { Image(systemName: "minus.magnifyingglass") }
                    .accessibilityLabel("Zoom out")
                Button { viewport.zoomBy(1.25) } label: { Image(systemName: "plus.magnifyingglass") }
                    .accessibilityLabel("Zoom in")
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.foreground)
            .padding(.horizontal, 16).padding(.vertical, 8)
            .glassEffect(.regular, in: .capsule)
        }
    }
}
