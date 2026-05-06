import {
  CharacterData,
  ItemData,
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
import { statusEffects } from './statusEffects/statusEffects';

export class Registry {
  private characters = new Map<string, CharacterData>();
  private skills = new Map<string, SkillData>();
  private items = new Map<string, ItemData>();
  private statusEffects = new Map<StatusEffectId, StatusEffectData>();

  constructor() {
    for (const character of [bram, vera, mira]) {
      this.characters.set(character.id, character);
    }

    for (const skill of [...bramSkills, ...veraSkills, ...miraSkills]) {
      this.skills.set(skill.id, skill);
    }

    for (const item of items) {
      this.items.set(item.id, item);
    }

    for (const effect of statusEffects) {
      this.statusEffects.set(effect.id, effect);
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
}

export const registry = new Registry();
