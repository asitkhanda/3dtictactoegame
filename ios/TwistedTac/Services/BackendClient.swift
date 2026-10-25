import Foundation
import Supabase

/// The shared Supabase client, built from the URL and publishable key in
/// Info.plist (set via Config/Supabase.local.xcconfig). Nil when the app was
/// built without them, in which case only local play is available — the same
/// graceful fallback as the web app's `isSupabaseConfigured`.
enum Backend {
    static let client: SupabaseClient? = {
        guard
            let urlString = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
            let key = Bundle.main.object(forInfoDictionaryKey: "SupabasePublishableKey") as? String,
            let url = URL(string: urlString), url.host() != nil,
            !key.isEmpty, !key.contains("your-key-here")
        else { return nil }
        return SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: SupabaseClientOptions(
                auth: .init(emitLocalSessionAsInitialSession: true)
            )
        )
    }()

    static var isConfigured: Bool { client != nil }
}
