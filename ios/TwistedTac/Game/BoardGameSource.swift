import Observation
import TwistedTacKit

/// What the 3D board needs from a game, local or online.
@MainActor
protocol BoardGameSource: AnyObject, Observable {
    var config: GameRulesConfig { get }
    var state: GameState { get }
    var lastMove: Int? { get }
    var winningLine: [Int]? { get }
    /// Whether a tap on the board should be accepted right now.
    var acceptsInput: Bool { get }
    func humanTap(_ index: Int)
}

extension LocalGameModel: BoardGameSource {}
