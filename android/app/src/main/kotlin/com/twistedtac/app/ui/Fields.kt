package com.twistedtac.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.SubcomposeAsyncImage
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.isSafeAvatarUrl
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale

/** A text field on a glass panel, with an optional trailing slot (status icon, spinner). */
@Composable
fun GlassTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    textStyle: TextStyle = TextStyle(color = Palette.foreground, fontSize = 18.sp),
    centered: Boolean = false,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    trailing: @Composable () -> Unit = {},
) {
    val style = textStyle.copy(textAlign = if (centered) TextAlign.Center else TextAlign.Start)
    Row(
        modifier.fillMaxWidth().glass(RoundedCornerShape(16.dp)).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text(placeholder, style = style.copy(color = Palette.muted.copy(alpha = 0.6f)), modifier = Modifier.fillMaxWidth())
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                textStyle = style,
                singleLine = true,
                cursorBrush = SolidColor(Palette.playerO),
                keyboardOptions = keyboardOptions,
                keyboardActions = keyboardActions,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        trailing()
    }
}

/** A player's picture, or their initial when there is none (or it isn't a safe URL). */
@Composable
fun AvatarView(url: String?, name: String, size: androidx.compose.ui.unit.Dp = 44.dp, modifier: Modifier = Modifier) {
    val initial: @Composable () -> Unit = {
        Box(
            Modifier.size(size).background(Palette.playerO.copy(alpha = 0.25f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                name.take(1).uppercase(),
                color = Palette.foreground,
                fontSize = (size.value * 0.42f).sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
    if (!url.isNullOrEmpty() && isSafeAvatarUrl(url)) {
        SubcomposeAsyncImage(
            model = url,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.size(size).clip(CircleShape),
            loading = { initial() },
            error = { initial() },
        )
    } else {
        Box(modifier) { initial() }
    }
}
