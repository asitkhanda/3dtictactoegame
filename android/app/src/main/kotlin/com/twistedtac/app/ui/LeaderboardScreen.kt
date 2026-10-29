package com.twistedtac.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.backend.LeaderboardResult
import com.twistedtac.app.backend.LeaderboardService
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.LeaderboardEntry
import kotlinx.coroutines.launch

@Composable
fun LeaderboardScreen(auth: AuthManager, onBack: () -> Unit) {
    var result by remember { mutableStateOf<LeaderboardResult?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        loading = true
        try {
            result = LeaderboardService.load(auth.userId)
            errorMessage = null
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            errorMessage = e.message ?: "Couldn't reach the server."
        }
        loading = false
    }
    LaunchedEffect(auth.userId) { load() }

    ScreenScaffold("Leaderboard", onBack) {
        val current = result
        when {
            loading && current == null -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                CircularProgressIndicator(color = Palette.playerO)
            }
            errorMessage != null -> Column(
                Modifier.fillMaxSize().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            ) {
                Text("Can't load the leaderboard", color = Palette.foreground, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                Text(errorMessage ?: "", color = Palette.muted, fontSize = 14.sp, textAlign = TextAlign.Center)
                GlassButton({ scope.launch { load() } }) { GlassLabel("Try again") }
            }
            current != null && current.entries.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
            ) {
                Text("No ranked games yet", color = Palette.foreground, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                Text("Win an online match to be first on the board.", color = Palette.muted, fontSize = 14.sp)
            }
            current != null -> PullToRefreshBox(
                isRefreshing = loading,
                onRefresh = { scope.launch { load() } },
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    val name = auth.profile?.username
                    if (current.userRank != null && name != null) YourRank(current.userRank, name)
                    current.entries.forEachIndexed { index, entry ->
                        LeaderRow(index + 1, entry, isMe = entry.id.lowercase() == auth.userId)
                    }
                }
            }
        }
    }
}

@Composable
private fun YourRank(rank: Int, name: String) {
    Row(
        Modifier.fillMaxWidth().glass(RoundedCornerShape(16.dp), tint = Palette.playerO).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Your rank", color = Palette.muted, modifier = Modifier.weight(1f))
        Text("#$rank", color = Palette.playerO, fontSize = 20.sp, fontWeight = FontWeight.Black)
        Text(name, color = Palette.foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun LeaderRow(rank: Int, entry: LeaderboardEntry, isMe: Boolean) {
    val medal = medalColor(rank)
    val tint = if (isMe) Palette.playerO else if (rank <= 3) medal else Color.White
    Row(
        Modifier
            .fillMaxWidth()
            .glass(RoundedCornerShape(18.dp), tint = tint, strength = if (isMe) 2f else if (rank <= 3) 1.4f else 0.8f)
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .clearAndSetSemantics { contentDescription = "Rank $rank, ${entry.username ?: "player"}, ${entry.points} points" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("$rank", color = medal, fontSize = 20.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center, modifier = Modifier.width(30.dp))
        AvatarView(entry.avatarUrl, entry.username ?: "?", 38.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(entry.username ?: "—", color = Palette.foreground, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${entry.wins}W · ${entry.losses}L · ${entry.draws}D", color = Palette.muted, fontSize = 12.sp)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text("${entry.points}", color = Palette.foreground, fontSize = 20.sp, fontWeight = FontWeight.Black)
            Text("pts", color = Palette.muted, fontSize = 11.sp)
        }
    }
}

private fun medalColor(rank: Int): Color = when (rank) {
    1 -> Color(1f, 0.82f, 0.3f)
    2 -> Color(0.78f, 0.8f, 0.85f)
    3 -> Color(0.85f, 0.55f, 0.3f)
    else -> Palette.foreground
}
