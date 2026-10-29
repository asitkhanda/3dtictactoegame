package com.twistedtac.app

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.game.LocalGameModel
import com.twistedtac.app.game.LocalMode
import com.twistedtac.app.theme.TwistedTacTheme
import com.twistedtac.app.ui.GameScreen
import com.twistedtac.app.ui.LandingScreen
import com.twistedtac.engine.GameRulesConfig
import com.twistedtac.engine.ViewMode

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        // Debug builds can open any board straight away, for testing and screenshots:
        //   adb shell am start -n com.twistedtac.app/.MainActivity --ei size 8 --ez flat false --es mode ai
        val debug = if (BuildConfig.DEBUG) {
            DebugOptions(
                size = intent.getIntExtra("size", 3),
                flat = intent.getBooleanExtra("flat", false),
                autoStart = when (intent.getStringExtra("mode")) {
                    "ai" -> LocalMode.VS_AI
                    "two" -> LocalMode.TWO_PLAYER
                    else -> null
                },
            )
        } else {
            null
        }
        setContent {
            TwistedTacTheme { TwistedTacApp(debug) }
        }
    }
}

/** One game being played, or null for the menu. [id] makes every game a fresh model. */
private data class ActiveGame(val mode: LocalMode, val id: Int)

/** Debug-build overrides; null in release, where the board is always the classic 3x3x3. */
private class DebugOptions(val size: Int, val flat: Boolean, val autoStart: LocalMode?)

@Composable
private fun TwistedTacApp(debug: DebugOptions?) {
    var game by remember { mutableStateOf(debug?.autoStart?.let { ActiveGame(it, 0) }) }
    var nextId by remember { mutableStateOf(1) }
    val feedback = GameFeedback.None

    val active = game
    if (active == null) {
        LandingScreen(onPlay = { mode -> game = ActiveGame(mode, nextId++) }, feedback = feedback)
    } else {
        val scope = rememberCoroutineScope()
        // The classic 3x3x3 cube; larger boards arrive with the purchase.
        val model = remember(active.id) {
            val config = GameRulesConfig.of(debug?.size ?: 3, if (debug?.flat == true) ViewMode.FLAT else ViewMode.CUBE)!!
            LocalGameModel(config, active.mode, scope, feedback)
        }
        GameScreen(model = model, feedback = feedback, onExit = { game = null })
    }
}
