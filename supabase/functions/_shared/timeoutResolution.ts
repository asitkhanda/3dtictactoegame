import {
  getTerminalWinner,
  type BoardState,
  type GameRulesConfig,
  type LayerResult,
} from './gameRules';

/**
 * Winner of a match whose opponent stayed disconnected past the timeout.
 * Whoever is still connected wins; the position never decides it, otherwise
 * the player who walked away could be paid for leaving. A position that is
 * already won keeps its winner.
 */
export function chooseTimeoutWinner(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  connectedPlayer: 'X' | 'O'
): 'X' | 'O' {
  return getTerminalWinner(config, board, layerWinners) ?? connectedPlayer;
}
