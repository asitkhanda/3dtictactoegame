import Foundation

/// Room invite links, as shared from the waiting room:
/// `https://twistedtac.com/join/ABC123`, plus a `twistedtac://join/ABC123`
/// scheme used for development and as a fallback.
public enum InviteLink {
    public static let hosts: Set<String> = ["twistedtac.com", "www.twistedtac.com"]
    public static let scheme = "twistedtac"

    /// The room code in `url`, upper-cased, or nil if it isn't an invite.
    public static func roomCode(from url: URL) -> String? {
        let scheme = url.scheme?.lowercased()
        let candidate: String?
        if scheme == "https" || scheme == "http" {
            guard let host = url.host()?.lowercased(), hosts.contains(host) else { return nil }
            let parts = url.pathComponents.filter { $0 != "/" }
            candidate = parts.count == 2 && parts[0].lowercased() == "join" ? parts[1] : nil
        } else if scheme == Self.scheme {
            // twistedtac://join/ABC123 puts "join" in the host position.
            let parts = url.pathComponents.filter { $0 != "/" }
            candidate = url.host()?.lowercased() == "join" && parts.count == 1 ? parts[0] : nil
        } else {
            return nil
        }
        guard let code = candidate, code.count == 6,
              code.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber) })
        else { return nil }
        return code.uppercased()
    }

    public static func url(for code: String) -> URL {
        URL(string: "https://twistedtac.com/join/\(code.uppercased())")!
    }
}
