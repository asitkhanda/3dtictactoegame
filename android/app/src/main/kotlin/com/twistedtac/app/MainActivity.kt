package com.twistedtac.app

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.backend.Backend
import com.twistedtac.app.backend.MatchService
import com.twistedtac.app.feedback.ArcadeFeedback
import com.twistedtac.app.game.GameSettings
import com.twistedtac.app.game.LocalGameModel
import com.twistedtac.app.game.LocalMode
import com.twistedtac.app.game.OnlineMatchModel
import com.twistedtac.app.theme.Palette
import com.twistedtac.app.theme.TwistedTacTheme
import com.twistedtac.app.ui.GameScreen
import com.twistedtac.app.ui.LandingScreen
import com.twistedtac.app.ui.LeaderboardScreen
import com.twistedtac.app.ui.LobbyScreen
import com.twistedtac.app.ui.OnlineGameScreen
import com.twistedtac.app.ui.ProfileScreen
import com.twistedtac.app.ui.SignInSheet
import com.twistedtac.app.ui.UsernameSheet
import com.twistedtac.engine.GameRulesConfig
import com.twistedtac.engine.MatchRow
import com.twistedtac.engine.ViewMode

class MainActivity : ComponentActivity() {
    private val app get() = application as TwistedTacApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        handleLink(intent)

        // Debug builds can open any board straight away, for testing and screenshots:
        //   adb shell am start -n com.twistedtac.app/.MainActivity --ei size 8 --ez flat false --es mode ai
        // and `--es moves 13,4,14` plays those cells in turn (use `--es mode two`).
        val debug = if (BuildConfig.DEBUG) {
            DebugOptions(
                size = intent.getIntExtra("size", 3),
                flat = intent.getBooleanExtra("flat", false),
                accessibleBoard = intent.getBooleanExtra("a11y", false),
                moves = intent.getStringExtra("moves")?.split(',')?.mapNotNull { it.trim().toIntOrNull() }.orEmpty(),
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
            TwistedTacTheme { TwistedTacApp(app.auth, app.links, debug) }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleLink(intent)
    }

    /** Invite links start a join; the Google sign-in return finishes a login. */
    private fun handleLink(intent: Intent) {
        val url = intent.data?.toString() ?: return
        if (!app.links.handle(url)) app.auth.handleDeeplink(intent)
    }
}

/** Debug-build overrides; null in release, where the board is always the classic 3x3x3. */
private class DebugOptions(
    val size: Int,
    val flat: Boolean,
    val accessibleBoard: Boolean,
    /** Cells played in turn as soon as the game opens, to set up a position. */
    val moves: List<Int>,
    val autoStart: LocalMode?,
)

private sealed interface Route {
    data class Local(val mode: LocalMode, val id: Int) : Route
    data object Leaderboard : Route
    data object Profile : Route
    data object Lobby : Route
    data class Online(val match: MatchRow, val id: Int) : Route
}

@Composable
private fun TwistedTacApp(auth: AuthManager, links: com.twistedtac.app.game.DeepLinkRouter, debug: DebugOptions?) {
    var nextId by remember { mutableStateOf(1) }
    // The menu is the bottom of the stack; everything else is pushed on top.
    val stack = remember {
        mutableStateListOf<Route>().also { list -> debug?.autoStart?.let { list.add(Route.Local(it, 0)) } }
    }
    var showSignIn by remember { mutableStateOf(false) }
    var joiningInvite by remember { mutableStateOf(false) }

    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    val settings = remember { GameSettings(context) }
    val feedback = remember { ArcadeFeedback(context, settings) }
    DisposableEffect(feedback) { onDispose { feedback.release() } }
    LaunchedEffect(Unit) { auth.start() }

    fun push(route: Route) { stack.add(route) }
    fun pop() { if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex) }

    // An opened invite link waits for sign-in, then joins the room.
    LaunchedEffect(links.pendingRoomCode, auth.phase) {
        val code = links.pendingRoomCode ?: return@LaunchedEffect
        when (auth.phase) {
            AuthManager.Phase.LOADING, AuthManager.Phase.NEEDS_USERNAME -> Unit // resume once ready
            AuthManager.Phase.SIGNED_OUT -> showSignIn = auth.isConfigured
            AuthManager.Phase.READY -> {
                if (joiningInvite) return@LaunchedEffect
                joiningInvite = true
                links.consume()
                try {
                    val match = MatchService.joinMatch(code)
                    stack.clear()
                    push(Route.Online(match, nextId++))
                } catch (e: Exception) {
                    links.errorMessage = e.message ?: "Couldn't join that room."
                }
                joiningInvite = false
            }
        }
    }

    when (val route = stack.lastOrNull()) {
        null -> {
            LandingScreen(
                auth = auth,
                onPlay = { mode -> push(Route.Local(mode, nextId++)) },
                onOnline = { push(Route.Lobby) },
                onLeaderboard = { push(Route.Leaderboard) },
                onProfile = { push(Route.Profile) },
                onSignIn = { showSignIn = true },
                feedback = feedback,
            )
        }
        is Route.Local -> {
            val model = remember(route.id) {
                // The classic 3x3x3 cube; larger boards arrive with the purchase.
                val config = GameRulesConfig.of(debug?.size ?: 3, if (debug?.flat == true) ViewMode.FLAT else ViewMode.CUBE)!!
                LocalGameModel(config, route.mode, scope, feedback).also { game -> debug?.moves?.forEach(game::humanTap) }
            }
            GameScreen(model, settings, feedback, debug?.accessibleBoard == true, onExit = ::pop)
        }
        Route.Leaderboard -> LeaderboardScreen(auth, onBack = ::pop)
        Route.Profile -> ProfileScreen(auth, onBack = ::pop)
        Route.Lobby -> LobbyScreen(
            auth = auth,
            size = 3,
            viewMode = ViewMode.CUBE,
            feedback = feedback,
            onBack = ::pop,
            onOpen = { match -> push(Route.Online(match, nextId++)) },
        )
        is Route.Online -> {
            val userId = auth.userId
            val model = remember(route.id) {
                userId?.let { OnlineMatchModel.create(route.match, it, MatchService, scope, feedback) }
            }
            if (model != null) {
                OnlineGameScreen(model, settings, feedback, debug?.accessibleBoard == true, onExit = ::pop)
            } else {
                BackHandler(onBack = ::pop)
                LaunchedEffect(Unit) { pop() }
            }
        }
    }

    // Offered from the menu, or when an invite arrives while signed out.
    if (showSignIn && auth.phase != AuthManager.Phase.READY) SignInSheet(auth, onDismiss = { showSignIn = false })
    // A new account can't do anything online until it has a username.
    if (auth.phase == AuthManager.Phase.NEEDS_USERNAME) UsernameSheet(auth)

    links.errorMessage?.let { message ->
        AlertDialog(
            onDismissRequest = { links.errorMessage = null },
            containerColor = Palette.backgroundTop,
            titleContentColor = Palette.foreground,
            textContentColor = Palette.muted,
            title = { Text("Couldn't join that room") },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { links.errorMessage = null }) { Text("OK", color = Palette.playerO) } },
        )
    }
}
