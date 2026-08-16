import {
  evaluatePositionFor,
  getImmediateWinningMoves,
  getTerminalWinner,
  type BoardState,
  type GameRulesConfig,
  type LayerResult,
} from './gameRules';

export function chooseTimeoutWinner(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  connectedPlayer: 'X' | 'O'
): 'X' | 'O' {
  const terminal = getTerminalWinner(config, board, layerWinners);
  if (terminal) return terminal;

  const xThreats = getImmediateWinningMoves(config, board, layerWinners, 'X').length;
  const oThreats = getImmediateWinningMoves(config, board, layerWinners, 'O').length;
  if (xThreats !== oThreats) return xThreats > oThreats ? 'X' : 'O';

  const xScore = evaluatePositionFor(config, board, layerWinners, 'X');
  const oScore = evaluatePositionFor(config, board, layerWinners, 'O');
  if (xScore !== oScore) return xScore > oScore ? 'X' : 'O';
  return connectedPlayer;
}
