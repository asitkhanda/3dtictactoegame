package com.twistedtac.app.backend

import com.twistedtac.app.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.FlowType
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.ktor.client.engine.okhttp.OkHttp
import java.util.concurrent.TimeUnit
import kotlin.time.Duration.Companion.seconds

/**
 * The shared Supabase client, built from the URL and publishable key in
 * `android/supabase.local.properties`. Null when the app was built without them,
 * in which case only local play is available — the same graceful fallback as the
 * web app's `isSupabaseConfigured` and the iOS `Backend`.
 */
object Backend {
    /** Where the browser sends the player back to the app after Google sign-in. */
    const val OAUTH_SCHEME = "twistedtac"
    const val OAUTH_HOST = "login-callback"
    const val OAUTH_CALLBACK = "$OAUTH_SCHEME://$OAUTH_HOST"

    val client: SupabaseClient? by lazy {
        val url = BuildConfig.SUPABASE_URL
        val key = BuildConfig.SUPABASE_KEY
        if (!url.startsWith("https://") || key.isEmpty() || "your-key-here" in key) {
            null
        } else {
            createSupabaseClient(supabaseUrl = url, supabaseKey = key) {
                // The default 10 seconds is too tight for a first request on a slow phone or tablet
                // connection (DNS, TLS and the request itself all count against it).
                requestTimeout = 30.seconds
                httpEngine = OkHttp.create {
                    config {
                        // Notice a connection that went quiet while the app sat idle (Wi-Fi sleep, NAT
                        // timeouts) instead of sending the next request into it and waiting.
                        pingInterval(15, TimeUnit.SECONDS)
                        retryOnConnectionFailure(true)
                    }
                }
                install(Auth) {
                    scheme = OAUTH_SCHEME
                    host = OAUTH_HOST
                    flowType = FlowType.PKCE
                }
                install(Postgrest)
                install(Realtime)
                install(Functions)
            }
        }
    }

    val isConfigured: Boolean get() = client != null
}
