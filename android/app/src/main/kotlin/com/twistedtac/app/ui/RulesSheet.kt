package com.twistedtac.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.theme.Palette

private val rules = listOf(
    "Play across layers" to "The classic board is a 3×3×3 cube: three stacked 3×3 layers. Rotate it to read lines through depth.",
    "Claim a layer" to "Complete a row, column or diagonal on one layer to claim it. A claimed layer locks. Claim 2 of 3 layers to win the match.",
    "Or strike through the stack" to "Connect three marks through depth — straight down the stack or along a space diagonal — and win on the spot.",
    "Draws" to "If no legal moves remain and nobody has won, the game is a draw.",
    "Controls" to "Drag to rotate, pinch to zoom, tap a glowing tile to place your mark.",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RulesSheet(onDismiss: () -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Palette.backgroundTop,
        contentColor = Palette.foreground,
    ) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Text("How to play", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            rules.forEachIndexed { index, (title, text) ->
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Box(
                        Modifier.size(32.dp).background(Palette.playerO.copy(alpha = 0.16f), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("${index + 1}", color = Palette.playerO, fontWeight = FontWeight.Bold)
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(title, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                        Text(text, color = Palette.muted, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}
