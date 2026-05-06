export interface Stats {
  hp: number;
  hpMax: number;
  attack: number;
  power: number;
  defense: number;
  speed: number;
  crit: number;
  resistance: number;
}

export interface Resources {
  vigor: number;
  vigorMax: number;
  mana: number;
  manaMax: number;
}

export type StatKey = keyof Stats;
