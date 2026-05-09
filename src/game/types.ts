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

export type GameStatus = 'waiting' | 'active' | 'white_won' | 'black_won' | 'draw';

export type Move = {
  from: number;
  to: number;
  piece: Piece;
  capturedPiece?: Piece | null;
  isCapture: boolean;
  isPromotion?: boolean;
  promotionPiece?: PromotionPieceType;
};

export type MoveRecord = {
  from: number;
  to: number;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  timestamp: number;
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
