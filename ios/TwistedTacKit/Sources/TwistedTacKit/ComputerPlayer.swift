import Dispatch

// Swift port of the computer opponent in gameRules.ts: negamax with alpha-beta
// pruning and iterative deepening, bounded by wall-clock time so it blocks a
// thread for the same short slice on every device. Every position it searches
// comes from applyMove, so the AI can never disagree with the rules.

private let searchTimeBudgetMs = 40.0
/// The clock is read every N nodes rather than every node.
private let timeCheckMask = 255
private let maxSearchDepth = 12
/// Score for a forced win, reduced by ply so quicker wins are preferred.
private let winScore = 1_000_000.0
/// Cross-layer lines end the match outright, so they outrank layer lines.
private let crossLineWeight = 1.35
private let layerClaimBonus = 900.0

private func nowMs() -> Double {
    Double(DispatchTime.now().uptimeNanoseconds) / 1_000_000
}

/// Hard ceiling so a pathological position can never spin unboundedly.
private func nodeBudget(for config: GameRulesConfig) -> Int {
    let cost = Double(config.cellCount * config.winLength)
    return max(20_000, min(600_000, Int((40_000_000 / cost).rounded())))
}

/// Every move that ends the match in `player`'s favour immediately.
private func findWinningMoves(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player,
    moves: [Int]
) -> [Int] {
    moves.filter { move in
        applyMove(config, board: board, layerWinners: layerWinners, index: move, isXNext: player == .x)?.winner == player
    }
}

public func getImmediateWinningMoves(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player
) -> [Int] {
    guard isValidBoardState(config, board), isValidLayerResults(config, layerWinners) else { return [] }
    return findWinningMoves(config, board, layerWinners, player: player, moves: legalMoves(config, board, layerWinners))
}

/// Value of holding `count` cells of a `winLength` line — steeply superlinear.
private func lineValue(count: Int, winLength: Int) -> Double {
    let remaining = winLength - count
    if remaining <= 0 { return 100_000 }
    return 1500 / pow3(remaining)
}

private func pow3(_ exponent: Int) -> Double {
    var result = 1.0
    for _ in 0..<exponent { result *= 3 }
    return result
}

/// Static judgement of an unfinished position from `player`'s point of view.
/// A line only counts if it holds no opposing mark and no empty cell stranded
/// in a claimed layer — those cells can never be filled again.
private func evaluatePosition(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player
) -> Double {
    let opponent = player.opponent
    let winLength = config.winLength
    var score = 0.0

    for line in config.lineIndex.all {
        if line.cells.count < winLength { continue }

        var mine = 0
        var theirs = 0
        var dead = false
        for cell in line.cells {
            if let value = board[cell] {
                if value == player { mine += 1 } else { theirs += 1 }
            } else if layerWinners[config.layerOf(cell)].winner != nil {
                dead = true
                break
            }
        }

        // Skip dead lines and already-completed ones (scored via layer bonuses).
        if dead || mine >= winLength || theirs >= winLength { continue }

        let weight = line.cross ? crossLineWeight : 1
        if theirs == 0 && mine > 0 {
            score += lineValue(count: mine, winLength: winLength) * weight
        } else if mine == 0 && theirs > 0 {
            score -= lineValue(count: theirs, winLength: winLength) * weight
        }
    }

    var myLayers = 0
    var theirLayers = 0
    for layer in layerWinners {
        if layer.winner == player { myLayers += 1 } else if layer.winner == opponent { theirLayers += 1 }
    }
    score += Double(myLayers - theirLayers) * layerClaimBonus
    return score
}

public func evaluatePositionFor(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player
) -> Double {
    guard isValidBoardState(config, board), isValidLayerResults(config, layerWinners) else {
        return -Double.infinity
    }
    return evaluatePosition(config, board, layerWinners, player: player)
}

/// Cheap static ordering — busier cells first — so alpha-beta prunes early.
/// Ties keep their original order, matching the stable sort in the TS engine.
private func orderMoves(_ moves: [Int], _ config: GameRulesConfig) -> [Int] {
    let weights = config.lineIndex.weightByCell
    return moves.enumerated()
        .sorted { a, b in
            let wa = weights[a.element], wb = weights[b.element]
            return wa != wb ? wa > wb : a.offset < b.offset
        }
        .map(\.element)
}

private struct SearchState {
    var nodes = 0
    let budget: Int
    let deadline: Double
    var aborted = false

    /// True once this search has spent its node or time allowance.
    func outOfBudget() -> Bool {
        if nodes > budget { return true }
        if nodes & timeCheckMask == 0 && nowMs() > deadline { return true }
        return false
    }
}

/// Value of the position for the player about to move. Callers must discard
/// results from an aborted search.
private func negamax(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player,
    depth: Int,
    ply: Int,
    alpha: Double,
    beta: Double,
    state: inout SearchState
) -> Double {
    let opponent = player.opponent
    let moves = legalMoves(config, board, layerWinners)
    if moves.isEmpty { return 0 }
    if depth <= 0 { return evaluatePosition(config, board, layerWinners, player: player) }

    var alpha = alpha
    var best = -Double.infinity

    for move in orderMoves(moves, config) {
        state.nodes += 1
        if state.outOfBudget() {
            state.aborted = true
            return best == -.infinity ? 0 : best
        }

        guard let result = applyMove(config, board: board, layerWinners: layerWinners, index: move, isXNext: player == .x)
        else { continue }

        var score: Double
        if result.winner == player {
            score = winScore - Double(ply)
        } else if result.draw {
            score = 0
        } else {
            score = -negamax(
                config, result.board, result.layerWinners,
                player: opponent, depth: depth - 1, ply: ply + 1,
                alpha: -beta, beta: -alpha, state: &state
            )
            if state.aborted { return best == -.infinity ? score : best }
        }

        if score > best { best = score }
        if best > alpha { alpha = best }
        if alpha >= beta { break }
    }
    return best
}

private struct RootResult {
    let moves: [Int]
    let score: Double
}

/// Scores every root move at a fixed depth, returning all joint-best moves.
private func searchRoot(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player,
    candidates: [Int],
    depth: Int,
    state: inout SearchState
) -> RootResult? {
    let opponent = player.opponent
    var best = -Double.infinity
    var bestMoves: [Int] = []

    for move in candidates {
        state.nodes += 1
        if state.outOfBudget() {
            state.aborted = true
            return nil
        }

        guard let result = applyMove(config, board: board, layerWinners: layerWinners, index: move, isXNext: player == .x)
        else { continue }

        var score: Double
        if result.winner == player {
            score = winScore
        } else if result.draw {
            score = 0
        } else {
            score = -negamax(
                config, result.board, result.layerWinners,
                player: opponent, depth: depth - 1, ply: 1,
                alpha: -.infinity, beta: .infinity, state: &state
            )
            if state.aborted { return nil }
        }

        if score > best {
            best = score
            bestMoves = [move]
        } else if score == best {
            bestMoves.append(move)
        }
    }
    return bestMoves.isEmpty ? nil : RootResult(moves: bestMoves, score: best)
}

/// Chooses the computer's move, or nil when no legal move exists.
///
/// Among moves the search rates equally the engine picks at random, so it
/// plays optimally without playing the identical game every time. Tests pass
/// a seeded generator to make that pick reproducible.
public func getComputerMove<G: RandomNumberGenerator>(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player = .o,
    using generator: inout G
) -> Int? {
    let opponent = player.opponent
    let moves = legalMoves(config, board, layerWinners)
    if moves.isEmpty { return nil }
    if config.size == 1 { return moves[0] }

    // Fast paths — search would find these too, but they are free and exact.
    let myWins = findWinningMoves(config, board, layerWinners, player: player, moves: moves)
    if let pick = myWins.randomElement(using: &generator) { return pick }

    let theirWins = findWinningMoves(config, board, layerWinners, player: opponent, moves: moves)
    if theirWins.count == 1 { return theirWins[0] }

    // Iterative deepening: keep the deepest completed result. Anything the
    // budget cuts short is discarded, so the move always comes from a search
    // that finished.
    let ordered = orderMoves(moves, config)
    var state = SearchState(budget: nodeBudget(for: config), deadline: nowMs() + searchTimeBudgetMs)
    let maxDepth = min(moves.count, maxSearchDepth)
    var chosen = ordered

    for depth in 1...max(1, maxDepth) {
        guard let result = searchRoot(
            config, board, layerWinners,
            player: player, candidates: ordered, depth: depth, state: &state
        ), !state.aborted else { break }
        chosen = result.moves
        // A forced win (or a proven loss) will not change with more depth.
        if result.score >= winScore - Double(maxSearchDepth) { break }
    }

    return chosen.randomElement(using: &generator)
}

public func getComputerMove(
    _ config: GameRulesConfig,
    _ board: Board,
    _ layerWinners: [LayerResult],
    player: Player = .o
) -> Int? {
    var generator = SystemRandomNumberGenerator()
    return getComputerMove(config, board, layerWinners, player: player, using: &generator)
}
