import { UPGRADES, UPGRADE_INFO } from '../../sim/state.ts';
import { MARK_INFO, MARKS } from '../../sim/record.ts';
import { AFFIXES, AFFIX_INFO, RARITIES, RARITY_INFO, SLOTS, SLOT_INFO } from '../../data/gear.ts';
import { STANCES } from '../../data/arts.ts';
import { SYSTEMS } from '../../sim/unlocks.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { LINES, PILL_LINES } from '../../data/alchemy.ts';
import { KEY } from '../copy.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from './Svg.tsx';

/**
 * 釋 What every character on the screen means.
 *
 * Bruno, who does not read Chinese: "está imensa informação só em chinês e não se
 * percebe bem os sistemas". He is right, and the fix is not to take the characters off
 * the screen — they are what the game looks like, and 九境 without them is a spreadsheet
 * about numbers going up. The fix is that no character is ever the *only* place a thing
 * is named, and that one page decodes all of them.
 *
 * Every row below is read out of the data it describes: the upgrades from UPGRADE_INFO,
 * the marks from MARK_INFO, the ranks and axes and slots from the gear tables, the
 * systems and the realms that open them from SYSTEMS. Nothing here is typed by hand, so
 * nothing here can drift away from the game and start lying. Add a gear axis and it
 * appears on this page by itself.
 */

interface Row { han: string; name: string; note?: string; colour?: string; art?: string }

/**
 * 圖 And where the game draws a thing, the key draws the same thing.
 *
 * A page of characters explaining characters helps least exactly where it is needed
 * most. The upgrades, the slots and the pill lines all carry an icon on the screen the
 * player met them on, so the key carries it too — it is the picture, not the word, that
 * a player recognises when they go back.
 */
function Group({ title, blurb, rows }: { title: string; blurb: string; rows: Row[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <p className="faint">{blurb}</p>
      <div className="keys">
        {rows.map((r) => (
          <span className="keyrow" key={r.han + r.name}>
            <b className="cjk" style={r.colour ? { color: r.colour } : undefined}>{r.han}</b>
            <span>
              <em>{r.name}</em>
              {r.note && <i>{r.note}</i>}
            </span>
            {r.art && <span className="art"><Svg html={icon(r.art, 26)} /></span>}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Key({ onClose }: { onClose: () => void }) {
  const held: Row[] = [
    { han: '氣', name: 'Qi', note: KEY.qi },
    { han: '力', name: 'Power', note: KEY.power },
    { han: '材', name: 'Material', note: KEY.material },
    { han: '道', name: 'Dao points', note: KEY.dao },
  ];

  const buys: Row[] = UPGRADES.map((u) => ({
    han: UPGRADE_INFO[u].han,
    name: UPGRADE_INFO[u].name,
    art: UPGRADE_INFO[u].icon,
    note: `${UPGRADE_INFO[u].effect} · paid in ${UPGRADE_INFO[u].currency === 'qi' ? '氣 qi' : '材 material'}`,
  }));

  const marks: Row[] = MARK_INFO.map((m, i) => ({
    han: m.han, name: m.name, note: KEY.mark(MARKS[i], m.pays),
  }));

  const ranks: Row[] = RARITIES.map((r) => ({
    han: RARITY_INFO[r].han, name: RARITY_INFO[r].name, colour: RARITY_INFO[r].colour,
    note: KEY.rank(RARITY_INFO[r].mult),
  }));

  const axes: Row[] = AFFIXES.map((a) => ({
    han: AFFIX_INFO[a].han, name: AFFIX_INFO[a].label,
  }));

  const slots: Row[] = SLOTS.map((s) => ({
    han: SLOT_INFO[s].han, name: SLOT_INFO[s].name, art: SLOT_INFO[s].empty,
  }));

  const systems: Row[] = SYSTEMS.map((s) => ({
    han: s.han, name: s.name,
    note: KEY.opensAt(realmOf(s.realm).han, realmOf(s.realm).name),
  }));

  const fighting: Row[] = [
    { han: '戰', name: 'Fight', note: KEY.fight },
    { han: '勢', name: 'Stance', note: KEY.stance(STANCES.length) },
    { han: '訣', name: 'Art', note: KEY.art },
    { han: '收', name: 'Collect', note: KEY.collect },
    { han: '退', name: 'Withdraw', note: KEY.withdraw },
  ];

  const lines: Row[] = LINES.map((l) => ({
    han: PILL_LINES[l].han, name: PILL_LINES[l].name, note: PILL_LINES[l].effect,
    art: PILL_LINES[l].icon,
  }));

  const doing: Row[] = [
    { han: '突破', name: 'Break through', note: KEY.breakThrough },
    { han: '滿', name: 'Full', note: KEY.full },
    { han: '存', name: 'Your save', note: KEY.save },
    { han: '碑', name: 'The stele', note: KEY.stele },
    { han: '歸', name: 'Welcome back', note: KEY.back },
  ];

  return (
    <div className="help key">
      <h2>{KEY.title}</h2>
      <p className="faint" style={{ fontSize: 13.5, marginTop: 0 }}>{KEY.blurb}</p>
      <Group title={KEY.heldHead} blurb={KEY.heldBlurb} rows={held} />
      <Group title={KEY.buysHead} blurb={KEY.buysBlurb} rows={buys} />
      <Group title={KEY.marksHead} blurb={KEY.marksBlurb} rows={marks} />
      <Group title={KEY.fightHead} blurb={KEY.fightBlurb} rows={fighting} />
      <Group title={KEY.ranksHead} blurb={KEY.ranksBlurb} rows={ranks} />
      <Group title={KEY.axesHead} blurb={KEY.axesBlurb} rows={axes} />
      <Group title={KEY.slotsHead} blurb={KEY.slotsBlurb} rows={slots} />
      <Group title={KEY.pillsHead} blurb={KEY.pillsBlurb} rows={lines} />
      <Group title={KEY.systemsHead} blurb={KEY.systemsBlurb} rows={systems} />
      <Group title={KEY.doingHead} blurb={KEY.doingBlurb} rows={doing} />
      <button className="act" style={{ marginTop: 4 }} onClick={onClose}>
        閉 <span>{KEY.close}</span>
      </button>
    </div>
  );
}
