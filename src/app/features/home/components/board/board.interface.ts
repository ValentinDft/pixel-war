export interface Cell {
  index: number;
  x: number;
  y: number;
  color: string;
}

export interface Row {
  y: number;
  cells: Cell[];
}
