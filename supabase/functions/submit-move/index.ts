import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type BoardSize = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type ViewMode = '2D' | '3D';
type Player = 'X' | 'O' | null;

interface GameConfig {
  size: BoardSize;
  viewMode: ViewMode;
  winLength: number;
  layerCount: number;
  matchWinThreshold: number;
  cellCount: number;
  cellsPerLayer: number;
  is3D: boolean;
  index: (x: number, y: number, z: number) => number;
  layerOf: (index: number) => number;
}

function createGameConfig(size: BoardSize, viewMode: ViewMode): GameConfig {
  const is3D = viewMode === '3D';
  const layerCount = is3D ? size : 1;
  const cellsPerLayer = size * size;
  const cellCount = is3D ? size * size * size : cellsPerLayer;
  const index = (x: number, y: number, z: number) => x + y * size + z * cellsPerLayer;
  const layerOf = (cellIndex: number) => Math.floor(cellIndex / cellsPerLayer);
  return {
    size,
    viewMode,
    winLength: size,
    layerCount,
    matchWinThreshold: is3D && size > 1 ? size - 1 : 0,
    cellCount,
    cellsPerLayer,
    is3D,
    index,
    layerOf,
  };
}

type BoardState = Player[];
type LayerResult = { winner: Player; line: number[] | null };

function generateLayerLines(config: GameConfig, layerIndex: number): number[][] {
  const { size, cellsPerLayer } = config;
  const lines: number[][] = [];
  const offset = layerIndex * cellsPerLayer;
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) row.push(offset + y * size + x);
    lines.push(row);
  }
  for (let x = 0; x < size; x++) {
    const col: number[] = [];
    for (let y = 0; y < size; y++) col.push(offset + y * size + x);
    lines.push(col);
  }
  const mainDiag: number[] = [];
  const antiDiag: number[] = [];
  for (let i = 0; i < size; i++) {
    mainDiag.push(offset + i * size + i);
    antiDiag.push(offset + i * size + (size - 1 - i));
  }
  lines.push(mainDiag, antiDiag);
  return lines;
}

function generateCrossLayerLines(config: GameConfig): number[][] {
  const { size } = config;
  const lines: number[][] = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const vertical: number[] = [];
      for (let z = 0; z < size; z++) vertical.push(config.index(x, y, z));
      lines.push(vertical);
    }
  }
  for (let y = 0; y < size; y++) {
    const forward: number[] = [];
    const back: number[] = [];
    for (let z = 0; z < size; z++) {
      forward.push(config.index(z, y, z));
      back.push(config.index(size - 1 - z, y, z));
    }
    lines.push(forward, back);
  }
  for (let x = 0; x < size; x++) {
    const forward: number[] = [];
    const back: number[] = [];
    for (let z = 0; z < size; z++) {
      forward.push(config.index(x, z, z));
      back.push(config.index(x, size - 1 - z, z));
    }
    lines.push(forward, back);
  }
  const spaceDiagonals = [
    (z: number) => config.index(z, z, z),
    (z: number) => config.index(size - 1 - z, z, z),
    (z: number) => config.index(z, size - 1 - z, z),
    (z: number) => config.index(size - 1 - z, size - 1 - z, z),
  ];
  for (const fn of spaceDiagonals) {
    const diag: number[] = [];
    for (let z = 0; z < size; z++) diag.push(fn(z));
    lines.push(diag);
  }
  return lines;
}

function checkLinesWinner(board: BoardState, lines: number[][], winLength: number) {
  for (const line of lines) {
    if (line.length < winLength) continue;
    const first = board[line[0]];
    if (!first) continue;
    if (line.every((idx) => board[idx] === first)) return { winner: first, line };
  }
  return { winner: null, line: null };
}

function checkCrossLayerWinner(config: GameConfig, board: BoardState) {
  if (!config.is3D || config.size <= 1) return { winner: null, line: null };
  return checkLinesWinner(board, generateCrossLayerLines(config), config.winLength);
}

function checkLayerWinner(config: GameConfig, board: BoardState, layerIndex: number) {
  return checkLinesWinner(board, generateLayerLines(config, layerIndex), config.winLength);
}

function checkBoardWinner(config: GameConfig, board: BoardState) {
  return checkLayerWinner(config, board, 0);
}

function isDraw(config: GameConfig, board: BoardState) {
  return board.every((cell) => cell !== null);
}

function hasLegalMoves(
  config: GameConfig,
  board: BoardState,
  layerWinners: LayerResult[]
) {
  for (let i = 0; i < config.cellCount; i++) {
    if (board[i] !== null) continue;
    const layerIndex = config.layerOf(i);
    if (layerWinners[layerIndex]?.winner) continue;
    return true;
  }
  return false;
}

function applyMove(
  config: GameConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  index: number,
  isXNext: boolean
) {
  const player: Player = isXNext ? 'X' : 'O';
  const layerIndex = config.layerOf(index);
  if (board[index] || layerWinners[layerIndex]?.winner) return null;

  const newBoard = [...board];
  newBoard[index] = player;
  const newLayerWinners = [...layerWinners];

  if (config.size === 1) {
    return { board: newBoard, layerWinners: newLayerWinners, winner: player, draw: false, isXNext: !isXNext };
  }

  if (config.is3D) {
    const crossLayerResult = checkCrossLayerWinner(config, newBoard);
    if (crossLayerResult.winner) {
      return { board: newBoard, layerWinners: newLayerWinners, winner: crossLayerResult.winner, draw: false, isXNext: !isXNext };
    }
    const layerResult = checkLayerWinner(config, newBoard, layerIndex);
    if (layerResult.winner) newLayerWinners[layerIndex] = layerResult;
    const xWins = newLayerWinners.filter((l) => l.winner === 'X').length;
    const oWins = newLayerWinners.filter((l) => l.winner === 'O').length;
    if (xWins >= config.matchWinThreshold) return { board: newBoard, layerWinners: newLayerWinners, winner: 'X' as Player, draw: false, isXNext: !isXNext };
    if (oWins >= config.matchWinThreshold) return { board: newBoard, layerWinners: newLayerWinners, winner: 'O' as Player, draw: false, isXNext: !isXNext };
  } else {
    const boardResult = checkBoardWinner(config, newBoard);
    if (boardResult.winner) {
      return { board: newBoard, layerWinners: newLayerWinners, winner: boardResult.winner, draw: false, isXNext: !isXNext };
    }
  }

  if (isDraw(config, newBoard) || !hasLegalMoves(config, newBoard, newLayerWinners)) {
    return { board: newBoard, layerWinners: newLayerWinners, winner: null, draw: true, isXNext: !isXNext };
  }

  return { board: newBoard, layerWinners: newLayerWinners, winner: null, draw: false, isXNext: !isXNext };
}

function getPlayerUserId(match: Record<string, unknown>, player: 'X' | 'O') {
  const hostPlaysX = Boolean(match.host_plays_x);
  if (player === 'X') return hostPlaysX ? match.host_id : match.guest_id;
  return hostPlaysX ? match.guest_id : match.host_id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchId, cellIndex } = await req.json();
    if (!matchId || typeof cellIndex !== 'number') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data: match, error: fetchError } = await adminClient
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) return Response.json({ error: 'Match not found' }, { status: 404 });
    if (match.status !== 'active') return Response.json({ error: 'Match not active' }, { status: 400 });
    if (match.current_turn_user_id !== user.id) return Response.json({ error: 'Not your turn' }, { status: 403 });
    if (user.id !== match.host_id && user.id !== match.guest_id) {
      return Response.json({ error: 'Not a participant' }, { status: 403 });
    }

    const config = createGameConfig(match.config.size, match.config.viewMode);
    const board = match.board as BoardState;
    const layerWinners = match.layer_winners as LayerResult[];
    const result = applyMove(config, board, layerWinners, cellIndex, match.is_x_next);
    if (!result) return Response.json({ error: 'Invalid move' }, { status: 400 });

    const nextTurnUserId = result.isXNext
      ? getPlayerUserId(match, 'X')
      : getPlayerUserId(match, 'O');

    const finished = Boolean(result.winner || result.draw);
    const updates = {
      board: result.board,
      layer_winners: result.layerWinners,
      is_x_next: result.isXNext,
      winner: result.winner,
      draw: result.draw,
      status: finished ? 'finished' : 'active',
      current_turn_user_id: finished ? null : nextTurnUserId,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await adminClient
      .from('matches')
      .update(updates)
      .eq('id', matchId)
      .select('*')
      .single();

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

    if (finished && match.host_id && match.guest_id) {
      const winner = result.winner as 'X' | 'O' | null;
      for (const player of ['X', 'O'] as const) {
        const playerId = getPlayerUserId(match, player) as string;
        const opponentId = getPlayerUserId(match, player === 'X' ? 'O' : 'X') as string;
        let outcome = 'draw';
        let pts = 5;
        if (!result.draw && winner) {
          outcome = winner === player ? 'win' : 'loss';
          pts = winner === player ? 25 : -5;
        }
        await adminClient.from('game_results').insert({
          player_id: playerId,
          opponent_id: opponentId,
          mode: 'PVP_ONLINE',
          board_size: match.config.size,
          outcome,
          points_earned: pts,
          match_id: matchId,
        });
        const { data: prof } = await adminClient
          .from('profiles')
          .select('points, wins, losses, draws, games_played')
          .eq('id', playerId)
          .single();
        if (prof) {
          await adminClient
            .from('profiles')
            .update({
              points: Math.max(0, prof.points + pts),
              wins: prof.wins + (outcome === 'win' ? 1 : 0),
              losses: prof.losses + (outcome === 'loss' ? 1 : 0),
              draws: prof.draws + (outcome === 'draw' ? 1 : 0),
              games_played: prof.games_played + 1,
            })
            .eq('id', playerId);
        }
      }
    }

    return Response.json({ match: updated }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
