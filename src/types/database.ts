export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  onboarding_completed_at: string | null;
  created_at: string;
}

export type MatchStatus = 'waiting' | 'active' | 'finished' | 'abandoned';

export type MatchConfig = {
  size: number;
  viewMode: '2D' | '3D';
}

export type MatchRow = {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  status: MatchStatus;
  config: MatchConfig;
  board: ('X' | 'O' | null)[];
  layer_winners: { winner: 'X' | 'O' | null; line: number[] | null }[];
  is_x_next: boolean;
  host_plays_x: boolean;
  winner: 'X' | 'O' | null;
  draw: boolean;
  current_turn_user_id: string | null;
  host_disconnected_at: string | null;
  guest_disconnected_at: string | null;
  host_last_seen_at: string | null;
  guest_last_seen_at: string | null;
  abandon_reason: string | null;
  created_at: string;
  updated_at: string;
  revision: number;
}

export type GameResult = {
  id: string;
  player_id: string;
  opponent_id: string | null;
  mode: string;
  board_size: number;
  outcome: 'win' | 'loss' | 'draw';
  points_earned: number;
  match_id: string | null;
  created_at: string;
  settlement_key: string | null;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: Partial<MatchRow> & { host_id: string; room_code: string; config: MatchConfig };
        Update: Partial<MatchRow>;
        Relationships: [];
      };
      game_results: {
        Row: GameResult;
        Insert: Partial<GameResult> & { player_id: string; mode: string; board_size: number; outcome: string; points_earned: number };
        Update: Partial<GameResult>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Functions: {
      set_username: { Args: { desired_username: string }; Returns: Profile };
      apply_match_result: {
        Args: {
          p_player_id: string;
          p_opponent_id: string;
          p_board_size: number;
          p_match_id: string;
          p_outcome: string;
          p_points: number;
        };
        Returns: undefined;
      };
      submit_match_move: {
        Args: { p_match_id: string; p_cell_index: number };
        Returns: MatchRow;
      };
      join_match_by_code: {
        Args: { p_room_code: string };
        Returns: MatchRow;
      };
      create_match: {
        Args: { p_board_size: number; p_view_mode?: string };
        Returns: MatchRow;
      };
      update_match_presence: {
        Args: { p_match_id: string; p_connected: boolean };
        Returns: void;
      };
      forfeit_match: {
        Args: { p_match_id: string };
        Returns: MatchRow;
      };
      check_username_available: {
        Args: { desired_username: string };
        Returns: boolean;
      };
      commit_match_move: {
        Args: {
          p_match_id: string;
          p_expected_revision: number;
          p_board: unknown;
          p_layer_winners: unknown;
          p_is_x_next: boolean;
          p_winner: 'X' | 'O' | null;
          p_draw: boolean;
          p_current_turn_user_id: string | null;
          p_status: 'active' | 'finished';
        };
        Returns: MatchRow;
      };
      settle_stale_match: {
        Args: {
          p_match_id: string;
          p_expected_revision: number;
          p_winner: 'X' | 'O' | null;
          p_draw: boolean;
          p_reason: string;
        };
        Returns: MatchRow;
      };
    };
  };
}
