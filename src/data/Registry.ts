import {
  CharacterData,
  Encounter,
  EncounterType,
  EnemyData,
  EventData,
  ItemData,
  SetData,
  SkillData,
  StatusEffectData,
  StatusEffectId,
} from '@/types';
import { bram } from './characters/bram';
import { vera } from './characters/vera';
import { mira } from './characters/mira';
import { bramSkills } from './skills/bramSkills';
import { veraSkills } from './skills/veraSkills';
import { miraSkills } from './skills/miraSkills';
import { items } from './items/items';
import { sets } from './sets/sets';
import { statusEffects } from './statusEffects/statusEffects';
import { bandidoHueco } from './enemies/bandidoHueco';
import { loboCorrupto } from './enemies/loboCorrupto';
import { peregrinoVacio } from './enemies/peregrinoVacio';
import { cuervoCarronero } from './enemies/cuervoCarronero';
import { acolitoSusurrante } from './enemies/acolitoSusurrante';
import { guardianOxidado } from './enemies/guardianOxidado';
import { elPregonero } from './enemies/elPregonero';
import { padreOxidado } from './enemies/padreOxidado';
import { act1Encounters } from './encounters/act1_encounters';
import { act1Events } from './events/act1_events';

export class Registry {
  private characters = new Map<string, CharacterData>();
  private skills = new Map<string, SkillData>();
  private items = new Map<string, ItemData>();
  private sets = new Map<string, SetData>();
  private statusEffects = new Map<StatusEffectId, StatusEffectData>();
  private enemies = new Map<string, EnemyData>();
  private encounters = new Map<string, Encounter>();
  private events = new Map<string, EventData>();

  constructor() {
    for (const character of [bram, vera, mira]) {
      this.characters.set(character.id, character);
    }

    for (const skill of [...bramSkills, ...veraSkills, ...miraSkills]) {
      this.registerSkill(skill);
    }

    for (const item of items) {
      this.items.set(item.id, item);
    }

    for (const set of sets) {
      this.sets.set(set.id, set);
    }

    for (const effect of statusEffects) {
      this.statusEffects.set(effect.id, effect);
    }

    for (const enemy of [
      bandidoHueco,
      loboCorrupto,
      peregrinoVacio,
      cuervoCarronero,
      acolitoSusurrante,
      guardianOxidado,
      elPregonero,
      padreOxidado,
    ]) {
      this.enemies.set(enemy.id, enemy);
    }

    for (const encounter of act1Encounters) {
      this.encounters.set(encounter.id, encounter);
    }

    for (const event of act1Events) {
      this.events.set(event.id, event);
    }
  }

  private registerSkill(skill: SkillData): void {
    this.skills.set(skill.id, skill);
    if (skill.improvedVersion) {
      this.registerSkill(skill.improvedVersion);
    }
  }

  getCharacter(id: string): CharacterData {
    const character = this.characters.get(id);
    if (!character) {
      throw new Error(`Registry: character not found '${id}'`);
    }
    return character;
  }

  getSkill(id: string): SkillData {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`Registry: skill not found '${id}'`);
    }
    return skill;
  }

  getItem(id: string): ItemData {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Registry: item not found '${id}'`);
    }
    return item;
  }

  getAllItems(): ItemData[] {
    return Array.from(this.items.values());
  }

  getSet(id: string): SetData {
    const set = this.sets.get(id);
    if (!set) {
      throw new Error(`Registry: set not found '${id}'`);
    }
    return set;
  }

  getAllSets(): SetData[] {
    return Array.from(this.sets.values());
  }

  getStatusEffect(id: StatusEffectId): StatusEffectData {
    const effect = this.statusEffects.get(id);
    if (!effect) {
      throw new Error(`Registry: status effect not found '${id}'`);
    }
    return effect;
  }

  getAllCharacters(): CharacterData[] {
    return Array.from(this.characters.values());
  }

  getEnemy(id: string): EnemyData {
    const enemy = this.enemies.get(id);
    if (!enemy) {
      throw new Error(`Registry: enemy not found '${id}'`);
    }
    return enemy;
  }

  getAllEnemies(): EnemyData[] {
    return Array.from(this.enemies.values());
  }

  getEncounter(id: string): Encounter {
    const encounter = this.encounters.get(id);
    if (!encounter) {
      throw new Error(`Registry: encounter not found '${id}'`);
    }
    return encounter;
  }

  getEncountersByActAndType(actNumber: number, type: EncounterType): Encounter[] {
    return Array.from(this.encounters.values()).filter(
      (encounter) => encounter.actNumber === actNumber && encounter.type === type,
    );
  }

  getEvent(id: string): EventData {
    const event = this.events.get(id);
    if (!event) {
      throw new Error(`Registry: event not found '${id}'`);
    }
    return event;
  }

  getAllEvents(): EventData[] {
    return Array.from(this.events.values());
  }
}

export const registry = new Registry();
