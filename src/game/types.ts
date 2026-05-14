export type Color = 'white' | 'black';

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export type PromotionPieceType = Exclude<PieceType, 'king' | 'pawn'>;

export type Piece = {
  id: string;
  type: PieceType;
  color: Color;
  hasMoved: boolean;
};

export type Square = {
  file: number;
  rank: number;
  piece: Piece | null;
};

export type Board = Square[];

export type GameMode = 'bot' | 'online';

export type GameStatus = 'waiting' | 'active' | 'white_won' | 'black_won' | 'draw' | 'expired' | 'timeout';

export type SquareCoord = {
  file: number;
  rank: number;
};

export type Move = {
  from: number;
  to: number;
  piece: Piece;
  capturedPiece?: Piece | null;
  isCapture: boolean;
  isPromotion?: boolean;
  promotionPiece?: PromotionPieceType;
  captureScore?: number | null;
};

export type MoveAnalysis = {
  bestMove: Move | null;
  isBestMove: boolean;
  isBlunder?: boolean;
  blunderSquare?: number | null;
  blunderReason?: 'worst_move' | 'piece_hanging' | 'worst_move_and_piece_hanging';
};

export type MoveRecord = {
  from: number;
  to: number;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  capturedColor?: Color;
  capturingSide?: Color;
  captureScore?: number;
  promotion?: PromotionPieceType | null;
  analysis?: MoveAnalysis;
  timestamp: number;
  clientMoveId?: string;
  playerId?: string;
};

export type MoveDelta = {
  id: string;
  moveNumber: number;
  from: SquareCoord;
  to: SquareCoord;
  piece: PieceType;
  color: Color;
  captured?: PieceType | null;
  capturedColor?: Color | null;
  capturingSide?: Color | null;
  captureScore?: number | null;
  promotion?: PromotionPieceType | null;
  san?: string;
  createdAt: string;
  playerId?: string;
};

export type GameState = {
  id: string;
  mode: GameMode;
  board: Board;
  turn: Color;
  status: GameStatus;
  selectedSquare: number | null;
  legalMoves: Move[];
  moveHistory: MoveRecord[];
  whitePlayerId?: string;
  blackPlayerId?: string;
  createdAt: number;
};
