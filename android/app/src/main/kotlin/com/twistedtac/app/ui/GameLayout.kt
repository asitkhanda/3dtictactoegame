package com.twistedtac.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.board.BoardView
import com.twistedtac.app.board.BoardViewport
import com.twistedtac.app.game.BoardGameSource
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.game.LayerEvent
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.GameRulesConfig

private val READABLE_WIDTH = 560.dp
private val SIDE_PANEL_WIDTH = 340.dp

/**
 * The in-game screen shared by local and online play: top bar, scoreboard, the 3D
 * board (or its TalkBack twin), status line and camera controls. Portrait stacks
 * them; landscape puts the board beside a panel of controls.
 */
@Composable
fun GameLayout(
    model: BoardGameSource,
    viewport: BoardViewport,
    feedback: GameFeedback,
    forceAccessibleBoard: Boolean,
    statusText: String,
    layerEvent: LayerEvent?,
    layerBannerLabel: (LayerEvent) -> String,
    topBar: @Composable (Modifier) -> Unit,
    scoreboard: @Composable (Modifier) -> Unit,
    banner: @Composable () -> Unit = {},
    overlay: @Composable () -> Unit = {},
) {
    val accessibleBoard = rememberAccessibleBoardNeeded(forceAccessibleBoard)

    val board: @Composable (Modifier) -> Unit = { modifier ->
        Box(modifier) {
            if (accessibleBoard) {
                AccessibleBoard(model, Modifier.fillMaxSize())
            } else {
                BoardView(model, viewport, Modifier.fillMaxSize())
                LayerBanner(layerEvent, layerBannerLabel, Modifier.align(Alignment.TopCenter))
            }
        }
    }
    val status: @Composable () -> Unit = {
        Text(
            text = statusText,
            color = Palette.foreground,
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
        )
    }
    val controls: @Composable (Modifier) -> Unit = { modifier ->
        if (!accessibleBoard) CameraControls(viewport, model.config.is3D, feedback, modifier)
    }

    Box(Modifier.fillMaxSize().background(Palette.background)) {
        BoxWithConstraints(Modifier.fillMaxSize().systemBarsPadding().padding(horizontal = 14.dp)) {
            if (maxWidth > maxHeight) {
                // Landscape: the board takes the height, the HUD stacks beside it.
                Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    board(Modifier.weight(1f).fillMaxHeight())
                    Column(
                        Modifier.width(SIDE_PANEL_WIDTH).fillMaxHeight().verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterVertically),
                    ) {
                        topBar(Modifier.padding(top = 4.dp))
                        banner()
                        scoreboard(Modifier)
                        status()
                        controls(Modifier.padding(bottom = 6.dp))
                    }
                }
            } else {
                Column(
                    Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    topBar(Modifier.widthIn(max = READABLE_WIDTH).padding(top = 4.dp))
                    banner()
                    scoreboard(Modifier.widthIn(max = READABLE_WIDTH))
                    board(Modifier.weight(1f).fillMaxWidth())
                    status()
                    controls(Modifier.widthIn(max = READABLE_WIDTH).padding(bottom = 6.dp))
                }
            }
        }
        overlay()
    }
}

/** Back button, title and subtitle, then [actions] on the right. */
@Composable
fun GameTopBar(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    backDescription: String,
    modifier: Modifier = Modifier,
    actions: @Composable RowScope.() -> Unit,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        IconControl(onBack, backDescription) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Palette.foreground) }
        Column(Modifier.weight(1f)) {
            Text(title, color = Palette.foreground, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = Palette.muted, fontSize = 12.sp)
        }
        actions()
    }
}

@Composable
fun IconControl(onClick: () -> Unit, description: String, icon: @Composable () -> Unit) {
    GlassButton(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        minHeight = 44.dp,
        description = description,
        modifier = Modifier.size(44.dp),
    ) { icon() }
}

@Composable
private fun LayerBanner(event: LayerEvent?, label: (LayerEvent) -> String, modifier: Modifier = Modifier) {
    AnimatedVisibility(
        visible = event != null,
        modifier = modifier.padding(top = 8.dp),
        enter = scaleIn() + fadeIn(),
        exit = scaleOut() + fadeOut(),
    ) {
        if (event != null) {
            Text(
                "LAYER ${event.layerNumber} · ${label(event)}",
                color = Palette.foreground,
                fontSize = 17.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier
                    .glass(RoundedCornerShape(50), tint = Palette.color(event.winner), strength = 3f)
                    .padding(horizontal = 18.dp, vertical = 10.dp),
            )
        }
    }
}

fun boardTitle(config: GameRulesConfig): String {
    val size = config.size
    if (size == 1) return "THE VOID"
    return if (config.is3D) "$size×$size×$size" else "$size×$size 2D"
}
