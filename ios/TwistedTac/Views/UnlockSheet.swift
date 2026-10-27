import SwiftUI
import StoreKit

/// Offers the one-time "Larger Boards" purchase.
struct UnlockSheet: View {
    @Environment(PurchaseManager.self) private var purchases
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 22) {
            Image(systemName: "cube.transparent")
                .font(.system(size: 54, weight: .light))
                .foregroundStyle(Theme.playerO)
                .padding(.top, 32)
                .accessibilityHidden(true)

            VStack(spacing: 8) {
                Text("Larger Boards")
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.foreground)
                    .accessibilityAddTraits(.isHeader)
                Text("One purchase, yours for good.")
                    .font(.callout)
                    .foregroundStyle(Theme.muted)
            }

            VStack(alignment: .leading, spacing: 12) {
                feature("square.stack.3d.up", "Every size from 1×1 up to 8×8×8")
                feature("square.grid.3x3", "Flat 2D boards")
                feature("globe", "Host online games on any board")
            }
            .frame(maxWidth: 360, alignment: .leading)
            .padding(.horizontal, 28)

            Spacer(minLength: 8)

            VStack(spacing: 12) {
                Button {
                    Task { await purchases.purchase() }
                } label: {
                    Group {
                        if purchases.activity == .purchasing {
                            ProgressView()
                        } else if let product = purchases.product {
                            Text("Unlock for \(product.displayPrice)")
                        } else {
                            Text("Price unavailable")
                        }
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.glassProminent)
                .tint(Theme.playerX)
                .controlSize(.extraLarge)
                .disabled(purchases.product == nil || purchases.activity != .idle)

                Button("Restore purchases") {
                    Task { await purchases.restore() }
                }
                .buttonStyle(.glass)
                .disabled(purchases.activity != .idle)

                if let message = purchases.message {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: 360)
            .padding(.horizontal, 28)
            .padding(.bottom, 20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
        .presentationDetents([.medium, .large])
        .onChange(of: purchases.ownsLargeBoards) { _, owns in
            if owns { dismiss() }
        }
    }

    private func feature(_ symbol: String, _ text: String) -> some View {
        Label {
            Text(text).foregroundStyle(Theme.foreground)
        } icon: {
            Image(systemName: symbol).foregroundStyle(Theme.playerO).frame(width: 26)
        }
    }
}
