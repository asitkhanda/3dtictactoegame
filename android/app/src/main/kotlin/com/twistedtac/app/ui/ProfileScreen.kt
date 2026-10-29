package com.twistedtac.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.Profile
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(auth: AuthManager, onBack: () -> Unit) {
    var confirmDelete by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { auth.refreshProfile() }

    ScreenScaffold("Profile", onBack) {
        val profile = auth.profile
        if (profile == null) {
            Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Palette.playerO) }
        } else {
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                Header(profile)
                Stats(profile)
                Column(Modifier.widthIn(max = 480.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    GlassButton(onClick = { auth.signOut(); onBack() }, modifier = Modifier.fillMaxWidth()) { GlassLabel("Sign out") }
                    GlassButton(onClick = { confirmDelete = true }, modifier = Modifier.fillMaxWidth()) {
                        if (auth.isWorking) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Palette.foreground)
                        else GlassLabel("Delete account", color = Palette.playerX)
                    }
                }
                deleteError?.let { Text(it, color = Palette.playerX, fontSize = 13.sp, textAlign = TextAlign.Center) }
                LegalLinks()
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            containerColor = Palette.backgroundTop,
            titleContentColor = Palette.foreground,
            textContentColor = Palette.muted,
            title = { Text("Delete your account?") },
            text = { Text("This permanently deletes your profile, stats and match history. It can't be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch {
                        deleteError = auth.deleteAccount()
                        if (deleteError == null) onBack()
                    }
                }) { Text("Delete account", color = Palette.playerX) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Keep my account", color = Palette.playerO) } },
        )
    }
}

@Composable
private fun Header(profile: Profile) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        AvatarView(profile.avatarUrl, profile.username ?: "?", 88.dp)
        Text(profile.username ?: "—", color = Palette.foreground, fontSize = 28.sp, fontWeight = FontWeight.Black)
        profile.displayName?.takeIf { it.isNotEmpty() }?.let { Text(it, color = Palette.muted, fontSize = 14.sp) }
    }
}

@Composable
private fun Stats(profile: Profile) {
    val rate = profile.winRate?.let { "${(it * 100).roundToInt()}%" } ?: "—"
    val stats = listOf(
        Triple("Points", "${profile.points}", Palette.playerO),
        Triple("Wins", "${profile.wins}", Palette.playerX),
        Triple("Losses", "${profile.losses}", null),
        Triple("Draws", "${profile.draws}", null),
        Triple("Played", "${profile.gamesPlayed}", null),
        Triple("Win rate", rate, null),
    )
    Column(Modifier.widthIn(max = 480.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        stats.chunked(3).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { (title, value, tint) ->
                    Column(
                        Modifier
                            .weight(1f)
                            .glass(RoundedCornerShape(16.dp), tint = tint ?: Color.White, strength = if (tint != null) 1.6f else 0.8f)
                            .padding(vertical = 14.dp)
                            .clearAndSetSemantics { contentDescription = "$title $value" },
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(value, color = Palette.foreground, fontSize = 22.sp, fontWeight = FontWeight.Black)
                        Text(title, color = Palette.muted, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
