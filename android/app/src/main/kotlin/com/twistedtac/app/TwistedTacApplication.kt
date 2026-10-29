package com.twistedtac.app

import android.app.Application
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.game.DeepLinkRouter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** Process-wide state: the account and any invite link that opened the app. */
class TwistedTacApplication : Application() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    val auth: AuthManager by lazy { AuthManager(scope) }
    val links = DeepLinkRouter()
}
