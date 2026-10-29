package com.twistedtac.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.view.accessibility.AccessibilityManager
import com.twistedtac.app.game.BoardGameSource
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.GameRulesConfig

/**
 * A 3D scene can't be read by TalkBack or driven by Switch Access, so when either
 * is on, the same game is shown as labelled buttons, layer by layer.
 * [forced] lets debug builds preview it without a screen reader.
 */
@Composable
fun rememberAccessibleBoardNeeded(forced: Boolean): Boolean {
    val manager = LocalContext.current.getSystemService(AccessibilityManager::class.java)
    var touchExploration by remember { mutableStateOf(manager?.isTouchExplorationEnabled == true) }
    DisposableEffect(manager) {
        val listener = AccessibilityManager.TouchExplorationStateChangeListener { touchExploration = it }
        manager?.addTouchExplorationStateChangeListener(listener)
        onDispose { manager?.removeTouchExplorationStateChangeListener(listener) }
    }
    return touchExploration || forced
}

/** Every cell as a button, grouped by layer, with spoken positions. */
@Composable
fun AccessibleBoard(model: BoardGameSource, modifier: Modifier = Modifier) {
    val config = model.config
    val state = model.state

    // Say where each move landed, as VoiceOver does on iOS.
    val view = LocalView.current
    LaunchedEffect(model.lastMove) {
        val move = model.lastMove ?: return@LaunchedEffect
        val mark = state.board[move]?.name ?: "Mark"
        @Suppress("DEPRECATION")
        view.announceForAccessibility("$mark placed, ${describeCell(move, config)}")
    }

    Column(
        modifier.verticalScroll(rememberScrollState()).padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        for (layer in 0 until config.layerCount) {
            val owner = state.layerWinners[layer].winner
            Column(
                Modifier.fillMaxWidth().glass(RoundedCornerShape(18.dp)).padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (config.is3D) {
                    Text(
                        "Layer ${layer + 1}" + (owner?.let { " — claimed by ${it.name}" } ?: ""),
                        color = Palette.foreground,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.semantics { heading() },
                    )
                }
                for (row in 0 until config.size) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (column in 0 until config.size) {
                            val index = layer * config.cellsPerLayer + row * config.size + column
                            Cell(model, index, locked = owner != null, modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Cell(model: BoardGameSource, index: Int, locked: Boolean, modifier: Modifier) {
    val mark = model.state.board[index]
    val enabled = mark == null && !locked && model.acceptsInput
    val label = describeCell(index, model.config) + ", " + (mark?.name ?: "empty")
    Box(
        modifier
            .heightIn(min = 48.dp)
            .background(Color.White.copy(alpha = if (mark == null) 0.08f else 0.04f), RoundedCornerShape(10.dp))
            .clickable(enabled = enabled) { model.humanTap(index) }
            .clearAndSetSemantics {
                contentDescription = label
                role = Role.Button
                if (enabled) onClick("Place your mark") { model.humanTap(index); true }
            },
        contentAlignment = Alignment.Center,
    ) {
        if (mark != null) MarkGlyph(mark, 22.dp)
    }
}

/** "layer 2, row 1, column 3" (layer omitted on flat boards). */
fun describeCell(index: Int, config: GameRulesConfig): String {
    val layer = index / config.cellsPerLayer
    val within = index % config.cellsPerLayer
    val place = "row ${within / config.size + 1}, column ${within % config.size + 1}"
    return if (config.is3D) "layer ${layer + 1}, $place" else place
}
