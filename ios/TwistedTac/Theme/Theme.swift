import SwiftUI
import TwistedTacKit

/// Palette from the web app's dark arcade theme (src/styles/globals.css).
enum Theme {
    static let playerX = Color(red: 1.0, green: 0.275, blue: 0.333)        // #ff4655
    static let playerXLight = Color(red: 1.0, green: 0.529, blue: 0.569)    // #ff8791
    static let playerO = Color(red: 0.231, green: 0.910, blue: 0.878)       // #3be8e0
    static let playerOLight = Color(red: 0.561, green: 0.953, blue: 0.933)  // #8ff3ee
    static let backgroundTop = Color(red: 0.055, green: 0.075, blue: 0.110)
    static let backgroundBottom = Color(red: 0.020, green: 0.027, blue: 0.043)
    static let foreground = Color(red: 0.925, green: 0.910, blue: 0.882)    // #ece8e1
    static let muted = Color(red: 0.62, green: 0.66, blue: 0.72)

    static func color(for player: Player) -> Color { player == .x ? playerX : playerO }
    static func lightColor(for player: Player) -> Color { player == .x ? playerXLight : playerOLight }

    static var background: some View {
        LinearGradient(colors: [backgroundTop, backgroundBottom], startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
    }
}

extension View {
    /// Keeps HUD rows to a comfortable width on iPad while the board uses the whole screen.
    func readableWidth(_ width: CGFloat = 560) -> some View {
        frame(maxWidth: width)
    }
}
