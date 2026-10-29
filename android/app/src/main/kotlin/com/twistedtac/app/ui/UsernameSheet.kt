package com.twistedtac.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.UsernameRules
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class Availability { UNKNOWN, CHECKING, AVAILABLE, TAKEN }

/**
 * Shown after the first sign-in until a username is chosen. Mirrors
 * UsernameOnboardingSheet.swift: live availability check, then submit.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsernameSheet(auth: AuthManager) {
    var username by remember { mutableStateOf("") }
    var availability by remember { mutableStateOf(Availability.UNKNOWN) }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(username) {
        error = null
        if (!UsernameRules.isValid(username)) {
            availability = Availability.UNKNOWN
            return@LaunchedEffect
        }
        availability = Availability.CHECKING
        delay(400) // debounce typing; the effect restarts when the text changes
        availability = if (auth.isUsernameAvailable(username)) Availability.AVAILABLE else Availability.TAKEN
    }

    val canSubmit = UsernameRules.isValid(username) && availability != Availability.TAKEN && !submitting
    fun submit() {
        if (!canSubmit) {
            if (!UsernameRules.isValid(username)) error = UsernameRules.REQUIREMENT
            return
        }
        scope.launch {
            submitting = true
            error = auth.setUsername(username)
            submitting = false
        }
    }

    // A new account can't do anything online until it has a username, so this can't be swiped away.
    ModalBottomSheet(
        onDismissRequest = {},
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true, confirmValueChange = { it != SheetValue.Hidden }),
        containerColor = Palette.backgroundTop,
        contentColor = Palette.foreground,
        properties = androidx.compose.material3.ModalBottomSheetProperties(shouldDismissOnBackPress = false),
    ) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Text("Pick your username", fontSize = 28.sp, fontWeight = FontWeight.Black)
            Text("Required to compete online and appear on the leaderboard.", color = Palette.muted, fontSize = 15.sp)

            GlassTextField(
                value = username,
                onValueChange = { username = it.trim() },
                placeholder = "username",
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { submit() }),
                trailing = {
                    when (availability) {
                        Availability.CHECKING -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Palette.muted)
                        Availability.AVAILABLE -> Icon(Icons.Filled.CheckCircle, "Available", tint = Palette.playerO)
                        Availability.TAKEN -> Icon(Icons.Filled.Warning, "Taken", tint = Palette.playerX)
                        Availability.UNKNOWN -> Unit
                    }
                },
            )

            val hint = when {
                error != null -> error!!
                !UsernameRules.isValid(username) -> UsernameRules.REQUIREMENT
                availability == Availability.TAKEN -> "That username is taken."
                availability == Availability.AVAILABLE -> "Looks good."
                else -> "Checking…"
            }
            Text(
                hint,
                fontSize = 13.sp,
                color = if (error != null || availability == Availability.TAKEN) Palette.playerX
                else if (availability == Availability.AVAILABLE) Palette.playerO else Palette.muted,
            )

            GlassButton(
                onClick = ::submit,
                modifier = Modifier.fillMaxWidth(),
                tint = Palette.playerX,
                prominent = true,
            ) {
                if (submitting) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Palette.foreground)
                else GlassLabel("Continue", color = if (canSubmit) Palette.foreground else Palette.muted)
            }

            Text(
                "Sign out",
                color = Palette.playerX,
                fontSize = 14.sp,
                modifier = Modifier.fillMaxWidth().clickableNoRipple { auth.signOut() }.padding(8.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}
