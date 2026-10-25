import Foundation
import Testing
@testable import TwistedTacKit

// Ported from src/utils/matchMerge.test.ts.

private func row(
    id: String = "m1",
    revision: Int = 1,
    board: Board = Board(repeating: nil, count: 27),
    status: MatchStatus = .active,
    guestDisconnectedAt: String? = nil
) -> MatchRow {
    MatchRow(
        id: id, roomCode: "ABC234", hostId: "h", guestId: "g", status: status,
        config: MatchConfig(size: 3, viewMode: .cube), board: board, layerWinners: [],
        isXNext: true, hostPlaysX: true, winner: nil, draw: false, currentTurnUserId: "h",
        hostDisconnectedAt: nil, guestDisconnectedAt: guestDisconnectedAt,
        hostLastSeenAt: nil, guestLastSeenAt: nil, abandonReason: nil,
        createdAt: "", updatedAt: "", revision: revision
    )
}

@Suite("Match merge")
struct MatchMergeTests {
    @Test("takes a higher revision wholesale")
    func higherRevision() {
        let next = row(revision: 2, status: .finished)
        #expect(mergeMatch(current: row(), next: next) == next)
    }

    @Test("ignores a stale revision")
    func staleRevision() {
        let current = row(revision: 3)
        #expect(mergeMatch(current: current, next: row(revision: 2, guestDisconnectedAt: "x")) == current)
    }

    @Test("applies a same-revision disconnect without touching the board")
    func presenceOnly() {
        var board = Board(repeating: nil, count: 27)
        board[4] = .x
        let merged = mergeMatch(current: row(board: board), next: row(guestDisconnectedAt: "2026-01-01T00:00:00Z"))
        #expect(merged?.guestDisconnectedAt == "2026-01-01T00:00:00Z")
        #expect(merged?.board == board)
    }

    @Test("keeps the current row when nothing changed")
    func unchanged() {
        let current = row()
        #expect(mergeMatch(current: current, next: row()) == current)
    }

    @Test("adopts a different match outright")
    func differentMatch() {
        let next = row(id: "m2")
        #expect(mergeMatch(current: row(), next: next) == next)
    }

    @Test("a nil incoming row keeps the current one")
    func nilNext() {
        let current = row()
        #expect(mergeMatch(current: current, next: nil) == current)
    }

    @Test("decodes a server row")
    func decodes() throws {
        let json = """
        {"id":"m1","room_code":"ABC234","host_id":"h","guest_id":null,"status":"waiting",
         "config":{"size":3,"viewMode":"3D"},"board":[null,"X","O"],"layer_winners":[{"winner":null,"line":null}],
         "is_x_next":true,"host_plays_x":true,"winner":null,"draw":false,"current_turn_user_id":"h",
         "host_disconnected_at":null,"guest_disconnected_at":null,"host_last_seen_at":null,
         "guest_last_seen_at":null,"abandon_reason":null,"created_at":"a","updated_at":"b","revision":0}
        """
        let match = try JSONDecoder().decode(MatchRow.self, from: Data(json.utf8))
        #expect(match.status == .waiting)
        #expect(match.board == [nil, .x, .o])
        #expect(match.config.rulesConfig?.cellCount == 27)
        #expect(match.symbol(for: "h") == .x)
        #expect(match.userId(for: .o) == nil)
    }
}
