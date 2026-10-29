package com.twistedtac.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.theme.Palette

/**
 * A translucent panel standing in for iOS's Liquid Glass: a faint tint over the
 * dark background with a soft highlight and a hairline edge.
 */
fun Modifier.glass(
    shape: Shape = RoundedCornerShape(18.dp),
    tint: Color = Color.White,
    strength: Float = 1f,
): Modifier = this
    .clip(shape)
    .background(
        Brush.verticalGradient(
            listOf(tint.copy(alpha = 0.16f * strength), tint.copy(alpha = 0.07f * strength)),
        ),
    )
    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.16f)), shape)

/** A tappable glass control. [prominent] fills it with [tint] like iOS's `.glassProminent`. */
@Composable
fun GlassButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = Color.White,
    prominent: Boolean = false,
    shape: Shape = RoundedCornerShape(16.dp),
    minHeight: Dp = 52.dp,
    description: String? = null,
    content: @Composable () -> Unit,
) {
    val base = if (prominent) Modifier.glass(shape, tint, strength = 4f) else Modifier.glass(shape, tint, strength = 1f)
    Box(
        modifier = modifier
            .then(base)
            .heightIn(min = minHeight)
            .clickable(role = Role.Button, onClick = onClick)
            .then(if (description != null) Modifier.semantics { contentDescription = description } else Modifier)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
fun GlassLabel(text: String, color: Color = Palette.foreground) {
    Text(text = text, color = color, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
}

val Capsule: Shape = CircleShape
