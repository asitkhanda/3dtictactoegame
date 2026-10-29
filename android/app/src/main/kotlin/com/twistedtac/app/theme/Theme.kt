package com.twistedtac.app.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.twistedtac.engine.Player

/** Palette from the web app's dark arcade theme (src/styles/globals.css), as on iOS. */
object Palette {
    val playerX = Color(0xFFFF4655)
    val playerXLight = Color(0xFFFF8791)
    val playerO = Color(0xFF3BE8E0)
    val playerOLight = Color(0xFF8FF3EE)
    val backgroundTop = Color(red = 0.055f, green = 0.075f, blue = 0.110f)
    val backgroundBottom = Color(red = 0.020f, green = 0.027f, blue = 0.043f)
    val foreground = Color(0xFFECE8E1)
    val muted = Color(red = 0.62f, green = 0.66f, blue = 0.72f)

    fun color(player: Player): Color = if (player == Player.X) playerX else playerO
    fun lightColor(player: Player): Color = if (player == Player.X) playerXLight else playerOLight

    val background: Brush get() = Brush.verticalGradient(listOf(backgroundTop, backgroundBottom))
}

private val ArcadeColors = darkColorScheme(
    primary = Palette.playerO,
    onPrimary = Palette.backgroundBottom,
    secondary = Palette.playerX,
    background = Palette.backgroundBottom,
    onBackground = Palette.foreground,
    surface = Color(0xFF121821),
    onSurface = Palette.foreground,
)

/** The game is always dark, like iOS (UIUserInterfaceStyle = Dark). */
@Composable
fun TwistedTacTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = ArcadeColors, content = content)
}
