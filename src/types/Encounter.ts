export type EncounterType = 'normal' | 'elite' | 'miniboss' | 'boss';

export interface Encounter {
  id: string;
  type: EncounterType;
  enemies: string[];
  actNumber: number;
  difficulty: number;
}
