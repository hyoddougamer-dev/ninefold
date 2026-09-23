import { useState } from 'react';
import {
  ALL_NODES, LINKS, NODE_BY_KEY, PATHS, PATH_INFO, ROOT, TOTAL_COST,
  nodesOf, type Node, type Path,
} from '../../data/techniques.ts';
import { canUnlock, daoSpent } from '../../sim/dao.ts';
import { type State } from '../../sim/state.ts';
import { isOpen, opensAt } from '../../sim/unlocks.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { DAO } from '../copy.ts';
import { Loadout } from '../ui/Loadout.tsx';
import { Term } from '../ui/Term.tsx';
import { earnedPoints as earnedOf, freePoints as freeOf } from '../../sim/points.ts';

/**
 * 道 The technique tree, drawn as a tree.
 *
 * The first version of this screen was a list of rows, and a list is not a tree: it
 * hides the one thing the player needs to see, which is the *shape*: where the branch
 * splits, what a choice closes off, how far the end is from here. So the branch is drawn
 * as a trunk of nodes with a real fork in the middle, and tapping a node opens its
 * detail underneath rather than spelling every node out at once.
 */

const R = 17;          // node radius
const GAP = 82;        // vertical distance between tiers, with room for two lines of name
const FORK = 21;       // how far a fork's two nodes sit from their column
const COLS: Record<Path, number> = { sword: 62, spirit: 180, fortune: 298 };
const W = 360;
const TOP = 26;        // where the root sits

type Status = 'have' | 'open' | 'poor' | 'shut' | 'locked';

function statusOf(
  node: Node, unlocked: readonly string[], free: number, keystones: boolean,
): Status {
  if (unlocked.includes(node.key)) return 'have';
  const twin = node.excludes ? NODE_BY_KEY[node.excludes] : null;
  if (twin && unlocked.includes(twin.key)) return 'shut';
  if (canUnlock(node.key, unlocked, free, keystones)) return 'open';
  // 樞 A keystone below its realm reads as locked, not as unaffordable: the difference
  // matters, because one of them is a thing you can fix by saving up.
  if (canUnlock(node.key, unlocked, Infinity, keystones)) return 'poor';
  return 'locked';
}

interface Placed { node: Node; x: number; y: number }

/**
 * Where every node sits on one canvas: the root at the top, three columns below it, and
 * a fork's two nodes offset to either side of their own column.
 */
function layout(): Placed[] {
  const out: Placed[] = [{ node: ROOT, x: COLS.spirit, y: TOP }];
  for (const path of PATHS) {
    const byTier = new Map<number, Node[]>();
    for (const node of nodesOf(path)) {
      if (!byTier.has(node.tier)) byTier.set(node.tier, []);
      byTier.get(node.tier)!.push(node);
    }
    for (const [tier, row] of byTier) {
      const y = TOP + 68 + tier * GAP;   // 68, not 52: the root's own name needs two lines
      if (row.length === 1) out.push({ node: row[0], x: COLS[path], y });
      else row.forEach((node, i) => out.push({ node, x: COLS[path] + (i === 0 ? -FORK : FORK), y }));
    }
  }
  return out;
}

/**
 * 譯 A node's name, broken into at most two lines so it fits under the circle.
 *
 * Two lines and not three: the tiers are 82 apart and a circle is 34 across, so there
 * are 48 pixels of clear air under each node and two lines of 9 use 18 of them. Two was
 * the first try at 68 apart and the second line sat on the ring below it, which is why
 * the tiers moved rather than the type shrinking. A name needing three lines at this
 * size is a name to shorten.
 */
function wrap(name: string): readonly string[] {
  const words = name.split(' ');
  if (words.length === 1) return [name];
  // The break that leaves the two halves closest in length reads best at this size.
  let best = 1;
  let gap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length;
    const b = words.slice(i).join(' ').length;
    if (Math.abs(a - b) < gap) { gap = Math.abs(a - b); best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

const PLACED = layout();
const HEIGHT = Math.max(...PLACED.map((p) => p.y)) + R + 26;
const AT = new Map(PLACED.map((p) => [p.node.key, p]));

/** Every edge once, so a bridge is not drawn twice. */
const EDGES: { a: Placed; b: Placed }[] = (() => {
  const seen = new Set<string>();
  const out: { a: Placed; b: Placed }[] = [];
  for (const [from, tos] of Object.entries(LINKS)) {
    for (const to of tos) {
      const id = [from, to].sort().join('|');
      if (seen.has(id)) continue;
      seen.add(id);
      const a = AT.get(from);
      const b = AT.get(to);
      if (a && b) out.push({ a, b });
    }
  }
  return out;
})();

type Half = 'tree' | 'build';

export function Dao({ state, onUnlock, onStance, onSequence }: {
  state: State;
  onUnlock: (key: string) => void;
  onStance: (key: string | null) => void;
  onSequence: (keys: string[]) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  /**
   * 半 Which half of the screen is showing.
   *
   * Bruno, at the fifth realm, with twenty-two points unspent: *"não encontro o
   * tree/path function estou confuso."* He was not missing it. It was fourteen hundred
   * pixels below the fold, under a stance picker, five sequence slots and an art pool:
   * a tab called 道 Path whose first screenful contains no path.
   *
   * Two things live here and they are different questions, so they get a switch instead
   * of a scroll, and the tree is the one that opens.
   */
  const [half, setHalf] = useState<Half>('tree');
  const earned = earnedOf(state);
  const spent = daoSpent(state.unlocked);
  const free = freeOf(state);
  // 樞 The three that cost you something arrive at their own realm, two above this one.
  const keys = isOpen(state.realm, 'keystones');
  const chosen = picked ? NODE_BY_KEY[picked] : null;
  const taken = ALL_NODES.filter((n) => state.unlocked.includes(n.key)).length;

  const hue = (node: Node) => (node.key === ROOT.key ? '#EDE3D2' : PATH_INFO[node.path].colour);

  // 道 The tree opens two realms after the build does. The points are earned from the
  // first layer either way, so it arrives full rather than arriving empty.
  const tree = isOpen(state.realm, 'tree');

  // Before the tree opens there is only one half, so there is nothing to switch.
  const showing: Half = tree ? half : 'build';

  return (
    <>
      {tree && (
        <div className="halves" role="tablist">
          <button role="tab" aria-selected={showing === 'tree'} data-on={showing === 'tree'}
                  onClick={() => setHalf('tree')}>
            <b className="cjk">道</b><em>{DAO.halfTree}</em>
            {free > 0 && <i className="pip">{free}</i>}
          </button>
          <button role="tab" aria-selected={showing === 'build'} data-on={showing === 'build'}
                  onClick={() => setHalf('build')}>
            <b className="cjk">勢</b><em>{DAO.halfBuild}</em>
          </button>
        </div>
      )}

      {/* 鎖 Before the tree opens, this tab is called Path and holds no path. Say so
          first rather than last: the answer to "where is it" belongs above the thing
          that is not it, not below a screenful of stances. */}
      {!tree && (
        <div className="waiting">
          <b className="cjk"><Term han="道" /></b>
          <p>{DAO.shut(earned, realmOf(opensAt('tree')).han, realmOf(opensAt('tree')).name)}</p>
        </div>
      )}

      {showing === 'build' && (
        <Loadout state={state} onStance={onStance} onSequence={onSequence} />
      )}

      {showing === 'tree' && <>
      <div className="row" style={{ marginTop: 18 }}>
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          <Term han="道" /> Techniques
        </span>
        <span className="mono" style={{ fontSize: 13 }}>
          <b style={{ color: free > 0 ? 'var(--gold)' : 'var(--faint)', fontSize: 19 }}>{free}</b>
          <span className="faint"> free · {spent}/{earned}</span>
        </span>
      </div>

      <p className="faint" style={{ fontSize: 12.5, margin: '6px 0 0', lineHeight: 1.65 }}>
        {DAO.tree}<br />
        {DAO.short(TOTAL_COST, 42)} {DAO.taken(taken, ALL_NODES.length)}.
      </p>

      <div className="legend">
        {PATHS.map((p) => (
          <span key={p} className="leg" style={{ ['--hue' as string]: PATH_INFO[p].colour }}>
            {/* 三 The legend was three coloured characters and three English names,
                and nothing on the screen ever said what a path *was*. */}
            <i /><b className="cjk"><Term han={PATH_INFO[p].han} sense="path" plain /></b> {PATH_INFO[p].name}
          </span>
        ))}
      </div>

      {chosen && (
        <Detail
          node={chosen}
          status={statusOf(chosen, state.unlocked, free, keys)}
          keystones={keys}
          onLearn={() => { onUnlock(chosen.key); setPicked(null); }}
          onClose={() => setPicked(null)}
        />
      )}

      <div className="canvas">
        <svg viewBox={`0 0 ${W} ${HEIGHT}`} className="treesvg" role="img"
             aria-label={`The technique tree, ${taken} of ${ALL_NODES.length} taken`}>
          {EDGES.map(({ a, b }) => {
            const lit = state.unlocked.includes(a.node.key) && state.unlocked.includes(b.node.key);
            const bridge = a.node.path !== b.node.path
              && a.node.key !== ROOT.key && b.node.key !== ROOT.key;
            const dead = statusOf(b.node, state.unlocked, free, keys) === 'shut'
              || statusOf(a.node, state.unlocked, free, keys) === 'shut';
            return (
              <line
                key={`${a.node.key}-${b.node.key}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={lit ? hue(b.node) : bridge ? '#D4AF56' : '#3A3226'}
                strokeWidth={lit ? 2.2 : bridge ? 1.6 : 1.2}
                strokeOpacity={dead ? 0.2 : bridge && !lit ? 0.6 : 1}
                strokeDasharray={bridge ? '3 4' : b.node.keystone ? '5 4' : undefined}
              />
            );
          })}

          {PLACED.map(({ node, x, y }) => {
            const status = statusOf(node, state.unlocked, free, keys);
            const on = status === 'have';
            const open = status === 'open';
            const colour = hue(node);
            const faded = status === 'locked' || status === 'shut';
            return (
              <g key={node.key} className="tnode" data-status={status}
                 onClick={() => setPicked(node.key)} style={{ cursor: 'pointer' }}>
                {open && <circle cx={x} cy={y} r={R + 5} fill={colour} fillOpacity=".13" />}
                <circle
                  cx={x} cy={y} r={R}
                  fill={on ? colour : '#1E1A14'} fillOpacity={on ? 0.24 : 1}
                  stroke={on || open ? colour : '#3A3226'}
                  strokeWidth={on ? 2.2 : open ? 1.7 : 1.1}
                  strokeDasharray={node.keystone ? '4 3' : undefined}
                  opacity={faded ? 0.4 : 1}
                />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="14.5"
                      fontFamily="'Noto Serif SC', serif"
                      fill={on ? colour : node.keystone ? '#D2604E' : '#EDE3D2'}
                      opacity={faded ? 0.45 : on ? 1 : 0.82}>{node.han}</text>
                {!on && (
                  <text x={x + R} y={y - R + 7} textAnchor="middle" fontSize="10"
                        fontFamily="Rajdhani, sans-serif" fontWeight="700"
                        fill={open ? '#D4AF56' : '#9C907C'}>{node.cost}</text>
                )}
                {/* 譯 The name, under the character.
                    Bruno: "existe muita coisa que só tem nomes chineses e não se percebe
                    pra non chinese people." Measured with npm run han, the tree was the
                    single worst place in the game for it: 27 nodes, 27 characters, and
                    the English name only on the sheet you get after tapping one. A tree
                    you cannot read at a glance is a tree nobody plans a build on. */}
                {wrap(node.name).map((row, i) => (
                  <text key={row} x={x} y={y + R + 12 + i * 9} textAnchor="middle" fontSize="8"
                        fontFamily="Archivo, sans-serif" letterSpacing=".02em"
                        fill={on ? colour : '#9C907C'}
                        opacity={faded ? 0.4 : on ? 0.95 : 0.8}>{row}</text>
                ))}
                {picked === node.key && (
                  <circle cx={x} cy={y} r={R + 4} fill="none" stroke="#EDE3D2"
                          strokeWidth="1" strokeOpacity=".7" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      </>}
    </>
  );
}

/* 點 Counting the wardens for the point total used to live here, and in App.tsx, and
   in four harnesses. It lives in sim/points.ts now, once, because 悟道 the cards hand
   points over too and a count in six places is a count that will disagree in five. */

function Detail({ node, status, keystones, onLearn, onClose }: {
  node: Node;
  status: Status;
  /** 樞 Whether the three that cost you something are open yet. See unlocks.ts. */
  keystones: boolean;
  onLearn: () => void;
  onClose: () => void;
}) {
  const info = PATH_INFO[node.path];
  const twin = node.excludes ? NODE_BY_KEY[node.excludes] : null;

  return (
    <div className="ndetail" style={{ ['--hue' as string]: info.colour }}>
      <div className="row">
        <span>
          <b className="cjk" style={{ fontSize: 21, color: node.keystone ? 'var(--magenta)' : info.colour }}>
            {node.han}
          </b>
          <em style={{ fontStyle: 'normal', marginLeft: 8, fontSize: 15 }}>{node.name}</em>
        </span>
        <button className="xclose" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 14 }}>{node.text}</p>
      {node.keystone && (
        <p className="faint" style={{ margin: '6px 0 0', fontSize: 12.5 }}>{DAO.keystone}</p>
      )}
      {node.keystone && !keystones && (
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--gold)' }}>
          {DAO.keystoneShut(realmOf(opensAt('keystones')).han, realmOf(opensAt('keystones')).name)}
        </p>
      )}
      {twin && (
        <p className="faint" style={{ margin: '5px 0 0', fontSize: 12.5 }}>
          {status === 'shut' ? DAO.closed(twin.han) : DAO.closes(twin.han, twin.name)}
        </p>
      )}
      <div className="row" style={{ marginTop: 11 }}>
        <span className="mono faint" style={{ fontSize: 12.5 }}>
          {status === 'have' ? DAO.learned : DAO.costs(node.cost)}
        </span>
        <button className="act" style={{ width: 'auto', padding: '9px 20px', fontSize: 15 }}
                disabled={status !== 'open'} onClick={onLearn}>
          {status === 'have' ? '已' : '習'}{' '}
          <span>{status === 'have' ? 'Learned' : status === 'poor' ? 'Not enough' : status === 'shut' ? 'Closed' : status === 'locked' ? 'Locked' : 'Learn'}</span>
        </button>
      </div>
    </div>
  );
}
