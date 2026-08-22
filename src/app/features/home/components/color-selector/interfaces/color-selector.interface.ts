export interface Swatch {
  color: string;
  label: string;
}

export interface SwatchState extends Swatch {
  selected: boolean;
}
