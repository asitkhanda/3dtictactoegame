package com.twistedtac.app

import com.twistedtac.app.backend.MatchBackend
import com.twistedtac.engine.MatchRow

/** Release builds have no previews; the debug source set provides the real ones. */
object DebugPreview {
    class OnlineScenario(val match: MatchRow, val userId: String, val backend: MatchBackend)

    fun online(name: String): OnlineScenario? = null
}
