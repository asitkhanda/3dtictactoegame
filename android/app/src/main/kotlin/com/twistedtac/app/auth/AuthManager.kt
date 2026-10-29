package com.twistedtac.app.auth

import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.twistedtac.app.backend.Backend
import com.twistedtac.engine.Profile
import com.twistedtac.engine.UsernameRules
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.handleDeeplinks
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Account state for the whole app: Google sign-in, the player's profile, and
 * username onboarding. Mirrors AuthManager.swift and src/contexts/AuthContext.tsx.
 */
class AuthManager(private val scope: CoroutineScope) {
    enum class Phase {
        LOADING,
        SIGNED_OUT,

        /** Signed in, but the profile has no username yet. */
        NEEDS_USERNAME,
        READY,
    }

    var phase by mutableStateOf(Phase.LOADING)
        private set
    var profile by mutableStateOf<Profile?>(null)
        private set
    var userId by mutableStateOf<String?>(null)
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var isWorking by mutableStateOf(false)
        private set

    val isConfigured: Boolean get() = Backend.isConfigured
    val isSignedIn: Boolean get() = userId != null

    private var listener: Job? = null

    /** Starts following the auth session. Call once at launch. */
    fun start() {
        if (listener != null) return
        val client = Backend.client
        if (client == null) {
            phase = Phase.SIGNED_OUT
            return
        }
        listener = scope.launch {
            client.auth.sessionStatus.collect { status ->
                when (status) {
                    is SessionStatus.Authenticated -> {
                        val id = status.session.user?.id?.lowercase()
                        if (id != null) didSignIn(id) else didSignOut()
                    }
                    is SessionStatus.NotAuthenticated -> didSignOut()
                    is SessionStatus.Initializing, is SessionStatus.RefreshFailure -> Unit
                }
            }
        }
    }

    private suspend fun didSignIn(id: String) {
        val changed = userId != id
        userId = id
        if (changed || profile == null) refreshProfile()
    }

    private fun didSignOut() {
        userId = null
        profile = null
        phase = Phase.SIGNED_OUT
    }

    /**
     * Signs in with Google through the browser. Uses the same Google setup as the
     * website and iOS, so existing accounts and their stats carry over.
     */
    fun signInWithGoogle() {
        val client = Backend.client ?: return
        errorMessage = null
        scope.launch {
            isWorking = true
            try {
                client.auth.signInWith(Google, redirectUrl = Backend.OAUTH_CALLBACK) {
                    queryParams["prompt"] = "select_account"
                }
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                errorMessage = "Couldn't sign you in with Google. Please try again."
            } finally {
                isWorking = false
            }
        }
    }

    /** Finishes a sign-in whose redirect reached the app as an intent. */
    fun handleDeeplink(intent: Intent) {
        Backend.client?.handleDeeplinks(intent)
    }

    fun signOut() {
        val client = Backend.client ?: return
        scope.launch {
            runCatching { client.auth.signOut() }
            didSignOut()
        }
    }

    suspend fun refreshProfile() {
        val client = Backend.client ?: return
        val id = userId ?: return
        try {
            val loaded = client.from("profiles").select { filter { eq("id", id) }; limit(1) }
                .decodeList<Profile>().firstOrNull()
                // The row is created by a database trigger at first sign-in; if it
                // isn't visible yet the next refresh will pick it up.
                ?: return
            profile = loaded
            phase = if (loaded.needsUsername) Phase.NEEDS_USERNAME else Phase.READY
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errorMessage = "Couldn't load your profile."
        }
    }

    /** Availability check used while typing. Fails closed, like the web app. */
    suspend fun isUsernameAvailable(username: String): Boolean {
        val client = Backend.client ?: return false
        return try {
            client.postgrest.rpc("check_username_available", buildJsonObject { put("desired_username", username) })
                .decodeAs<Boolean>()
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            false
        }
    }

    /** Returns an error message, or null on success. */
    suspend fun setUsername(username: String): String? {
        val client = Backend.client ?: return "No backend connection."
        if (!UsernameRules.isValid(username)) return UsernameRules.REQUIREMENT
        return try {
            val updated = client.postgrest.rpc("set_username", buildJsonObject { put("desired_username", username) })
                .decodeAs<Profile>()
            profile = updated
            phase = if (updated.needsUsername) Phase.NEEDS_USERNAME else Phase.READY
            null
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            "That username isn't available."
        }
    }

    /**
     * Permanently deletes the account and its data. Returns an error message, or
     * null on success. Google accounts need no token revocation, so the request
     * carries no authorization code.
     */
    suspend fun deleteAccount(): String? {
        val client = Backend.client ?: return "No backend connection."
        isWorking = true
        return try {
            client.functions.invoke("delete-account", body = buildJsonObject { put("authorizationCode", JsonNull) })
            runCatching { client.auth.signOut() }
            didSignOut()
            null
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            "Couldn't delete your account. Please try again, or contact support."
        } finally {
            isWorking = false
        }
    }
}
