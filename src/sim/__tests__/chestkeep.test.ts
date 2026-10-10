import { describe, expect, it } from 'vitest';
import { newState, type State } from '../state.ts';
import { validate } from '../load.ts';
import { limitFor } from '../stash.ts';
import { equip } from '../chest.ts';
import { GEAR, SLOTS, callingOf, schoolOf, type Item, type Worn } from '../../data/gear.ts';
import { rollDrop } from '../drops.ts';
import { BEASTS } from '../../data/bestiary.ts';

/**
 * 藏 Nothing in the chest is lost to a reload (the audit of 2026-10-05).
 *
 * A chest can honestly hold more than its limit: the limit falls when a 藏 piece comes
 * off, when 甲匠 the Armourer is left, when 空囊 caps the chest. validate() kept only the
 * limit plus the chest's own 藏 lines, and threw the rest away on the next load. And its
 * cap on a line sat under the game's own rounding, so an honest 藏 1 came back as 0.9.
 */
const now = 2_000_000_000;
const mk = (t: (typeof GEAR)[number], id: string): Item => ({ id, template: t.key, rarity: 'spirit', rolls: [{ affix: t.affix, value: 1 }], from: 'rat' });
const reload = (s: State) => validate(JSON.parse(JSON.stringify(s)), now + 1);

describe('藏 a reload never takes a piece from the chest', () => {
  it('an honest 藏 1 on a low piece reloads as 1, and a full chest keeps every piece', () => {
    const rat = BEASTS.find((b) => b.key === 'rat')!;
    let found: Item | null = null;
    for (let seed = 1; seed < 200_000 && !found; seed++) {
      const it = rollDrop(rat, 2, seed, { chance: 1, always: true }, 8);
      if (it && ['spirit', 'mystic'].includes(it.rarity) && it.rolls.slice(1).some((x) => x.affix === 'capacity' && x.value === 1)) found = it;
    }
    expect(found).not.toBeNull();
    const slot = GEAR.find((g) => g.key === found!.template)!.slot;
    const s: State = { ...newState(now - 10 * 86400), at: now, realm: 2, worn: { [slot]: found! } };
    const back = reload(s);
    expect(back.worn[slot]!.rolls.find((x) => x.affix === 'capacity')!.value).toBe(1);
    const t1 = GEAR.find((g) => g.realm === 1)!;
    const full: State = { ...s, chest: Array.from({ length: limitFor(s) }, (_, i) => mk(t1, `c${i}`)) };
    expect(reload(full).chest).toHaveLength(full.chest.length);
  });

  it('the Armourer who changes one weapon keeps all hundred and forty-one', () => {
    const r4 = GEAR.filter((t) => t.realm === 4);
    const want = ['body', 'body', 'body', 'artificer', 'artificer', 'artificer'];
    const worn: Worn = {};
    SLOTS.forEach((slot, i) => {
      const t = r4.find((x) => x.slot === slot && schoolOf(mk(x, 'x')) === want[i])
        ?? r4.find((x) => x.slot === slot && ['body', 'artificer'].includes(schoolOf(mk(x, 'x'))));
      if (t) worn[slot] = mk(t, `w-${slot}`);
    });
    expect(callingOf(worn).pair?.key).toBe('armourer');
    const other = r4.find((x) => x.slot === 'weapon' && !['body', 'artificer'].includes(schoolOf(mk(x, 'x'))))!;
    let s: State = { ...newState(now - 40 * 86400), at: now, realm: 5, worn };
    const chest: Item[] = [mk(other, 'swap')];
    for (let i = 1; i < limitFor(s); i++) chest.push(mk(r4[i % r4.length], `c${i}`));
    s = { ...s, chest };
    const e = equip(s.worn, s.chest, s.chest[0], 'weapon');
    const swapped: State = { ...s, worn: e.worn, chest: [...e.chest] };
    expect(limitFor(swapped)).toBeLessThan(swapped.chest.length);
    expect(reload(swapped).chest).toHaveLength(swapped.chest.length);
  });

  it('空囊 the keystone that caps the chest at twelve never takes the forty already in it', () => {
    const tpl = GEAR.find((t) => t.realm === 4)!;
    const chest = Array.from({ length: 40 }, (_, i) => mk(tpl, `p${i}`));
    const unlocked = ['root', 'gleaning', 'keeneye', 'pouch', 'defthands', 'goodluck', 'emptypouch'];
    const s: State = { ...newState(now - 30 * 86400), at: now, realm: 5, chest, unlocked, metPoints: 100 };
    expect(limitFor(s)).toBe(12);
    const back = reload(s);
    expect(back.unlocked).toContain('emptypouch');
    expect(back.chest).toHaveLength(40);
  });

  it('but a forged chest is still bounded by what its pieces could ever hold', () => {
    const tpl = GEAR.find((t) => t.realm === 1 && t.affix !== 'capacity')!;
    const s: State = { ...newState(now - 30 * 86400), at: now, realm: 1, chest: Array.from({ length: 5000 }, (_, i) => mk(tpl, `f${i}`)) };
    expect(reload(s).chest.length).toBeLessThan(200);
  });
});
