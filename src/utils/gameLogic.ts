// The rules engine lives in supabase/functions/_shared/gameRules.ts so the
// client and the submit-move edge function share one implementation.
export {
  type Player,
  type BoardState,
  type LayerResult,
  type GameState,
  type MoveResult,
  createInitialState,
  generateLayerLines,
  generateCrossLayerLines,
  checkCrossLayerWinner,
  checkLayerWinner,
  checkBoardWinner,
  isLayerFull,
  isDraw,
  hasLegalMoves,
  applyMove,
  getComputerMove,
} from '../../supabase/functions/_shared/gameRules';
