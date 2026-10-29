package com.twistedtac.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.theme.Palette

private const val PRIVACY_URL = "https://twistedtac.com/privacy-policy"
private const val TERMS_URL = "https://twistedtac.com/terms-of-service"

/** Explains why to sign in, then offers Google sign-in. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignInSheet(auth: AuthManager, onDismiss: () -> Unit) {
    // Close once the browser hands us back a session.
    LaunchedEffect(auth.isSignedIn) { if (auth.isSignedIn) onDismiss() }

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
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Text("Compete online", fontSize = 28.sp, fontWeight = FontWeight.Black)
            Text(
                "Sign in to play ranked matches, track your wins and climb the leaderboard. " +
                    "Already play on the website with Google? Use the same account here to keep your stats. " +
                    "Local games never need an account.",
                color = Palette.muted,
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
            )

            if (auth.isConfigured) {
                GoogleButton(enabled = !auth.isWorking, onClick = auth::signInWithGoogle)
                if (auth.isWorking) CircularProgressIndicator(color = Palette.playerO, modifier = Modifier.size(28.dp))
            } else {
                Text(
                    "This build has no backend connection, so sign-in is unavailable.",
                    color = Palette.muted,
                    fontSize = 13.sp,
                )
            }
            auth.errorMessage?.let {
                Text(it, color = Palette.playerX, fontSize = 13.sp, textAlign = TextAlign.Center)
            }
            LegalLinks()
        }
    }
}

@Composable
private fun GoogleButton(enabled: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 54.dp)
            .clip(CircleShape)
            .background(Color.White)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = "Continue with Google" },
        horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GoogleMark()
        Text("Continue with Google", color = Color.Black, fontSize = 18.sp, fontWeight = FontWeight.Medium)
    }
}

/** A simple four-colour "G". Swap in Google's official asset before launch for pixel-exact branding. */
@Composable
private fun GoogleMark() {
    Canvas(Modifier.size(20.dp)) {
        val stroke = Stroke(width = size.width * 0.2f)
        val inset = stroke.width / 2
        val arc = Size(size.width - stroke.width, size.height - stroke.width)
        val origin = Offset(inset, inset)
        // Blue, green, yellow, red, as the sweeps of Google's "G".
        drawArc(Color(0xFFEA4335), 200f, 90f, false, origin, arc, style = stroke)
        drawArc(Color(0xFFFBBC05), 130f, 70f, false, origin, arc, style = stroke)
        drawArc(Color(0xFF34A853), 50f, 80f, false, origin, arc, style = stroke)
        drawArc(Color(0xFF4285F4), -10f, 60f, false, origin, arc, style = stroke)
        drawLine(Color(0xFF4285F4), Offset(size.width * 0.5f, size.height * 0.5f), Offset(size.width - inset, size.height * 0.5f), stroke.width)
    }
}

@Composable
fun LegalLinks() {
    val context = LocalContext.current
    fun open(url: String) = context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("Privacy", color = Palette.muted, fontSize = 13.sp, modifier = Modifier.clickable { open(PRIVACY_URL) }.padding(8.dp))
        Text("·", color = Palette.muted, fontSize = 13.sp)
        Text("Terms", color = Palette.muted, fontSize = 13.sp, modifier = Modifier.clickable { open(TERMS_URL) }.padding(8.dp))
    }
}
