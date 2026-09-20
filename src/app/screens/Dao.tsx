import { useState } from 'react';
import { WARDENS } from '../../data/bestiary.ts';
import {
  ALL_NODES, LINKS, NODE_BY_KEY, PATHS, PATH_INFO, ROOT, TOTAL_COST,
  nodesOf, type Node, type Path,
} from '../../data/techniques.ts';
import { canUnlock, daoEarned, daoFree, daoSpent } from '../../sim/dao.ts';
import { layersOpened } from '../../sim/time.ts';
import type { State } from '../../sim/state.ts';
import { isOpen, opensAt } from '../../sim/unlocks.ts';
import { realm as realmOf } from '../../data/realms.ts';
import { DAO } from '../copy.ts';
import { Loadout } from '../ui/Loadout.tsx';

/**
 * 道 The technique tree, drawn as a tree.
 *
 * The first version of this screen was a list of rows, and a list is not a tree: it
 * hides the one thing the player needs to see, which is the *shape* — where the branch
 * splits, what a choice closes off, how far the end is from here. So the branch is drawn
 * as a trunk of nodes with a real fork in the middle, and tapping a node opens its
 * detail underneath rather than spelling every node out at once.
 */

const R = 17;          // node radius
const GAP = 58;        // vertical distance between tiers
const FORK = 21;       // how far a fork's two nodes sit from their column
const COLS: Record<Path, number> = { sword: 62, spirit: 180, fortune: 298 };
const W = 360;
const TOP = 26;        // where the root sits

type Status = 'have' | 'open' | 'poor' | 'shut' | 'locked';

function statusOf(node: Node, unlocked: readonly string[], free: number): Status {
  if (unlocked.includes(node.key)) return 'have';
  const twin = node.excludes ? NODE_BY_KEY[node.excludes] : null;
  if (twin && unlocked.includes(twin.key)) return 'shut';
  if (canUnlock(node.key, unlocked, free)) return 'open';
  if (canUnlock(node.key, unlocked, Infinity)) return 'poor';
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
      const y = TOP + 52 + tier * GAP;
      if (row.length === 1) out.push({ node: row[0], x: COLS[path], y });
      else row.forEach((node, i) => out.push({ node, x: COLS[path] + (i === 0 ? -FORK : FORK), y }));
    }
  }
  return out;
}

const PLACED = layout();
const HEIGHT = Math.max(...PLACED.map((p) => p.y)) + R + 14;
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

export function Dao({ state, onUnlock, onStance, onSequence }: {
  state: State;
  onUnlock: (key: string) => void;
  onStance: (key: string | null) => void;
  onSequence: (keys: string[]) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const wardens = countWardens(state);
  const earned = daoEarned(layersOpened(state), wardens);
  const spent = daoSpent(state.unlocked);
  const free = daoFree(layersOpened(state), wardens, state.unlocked);
  const chosen = picked ? NODE_BY_KEY[picked] : null;
  const taken = ALL_NODES.filter((n) => state.unlocked.includes(n.key)).length;

  const hue = (node: Node) => (node.key === ROOT.key ? '#E7EAFF' : PATH_INFO[node.path].colour);

  // 道 The tree opens two realms after the build does. The points are earned from the
  // first layer either way, so it arrives full rather than arriving empty.
  const tree = isOpen(state.realm, 'tree');

  return (
    <>
      <Loadout state={state} onStance={onStance} onSequence={onSequence} />

      {!tree && (
        <p className="faint" style={{ margin: '24px 0 0', fontSize: 13 }}>
          {DAO.shut(earned, realmOf(opensAt('tree')).han, realmOf(opensAt('tree')).name)}
        </p>
      )}

      {tree && <>
      <div className="row" style={{ marginTop: 26 }}>
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          道 Techniques
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
            <i /><b className="cjk">{PATH_INFO[p].han}</b> {PATH_INFO[p].name}
          </span>
        ))}
      </div>

      {chosen && (
        <Detail
          node={chosen}
          status={statusOf(chosen, state.unlocked, free)}
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
            const dead = statusOf(b.node, state.unlocked, free) === 'shut'
              || statusOf(a.node, state.unlocked, free) === 'shut';
            return (
              <line
                key={`${a.node.key}-${b.node.key}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={lit ? hue(b.node) : bridge ? '#FFCE6B' : '#252A5C'}
                strokeWidth={lit ? 2.2 : bridge ? 1.6 : 1.2}
                strokeOpacity={dead ? 0.2 : bridge && !lit ? 0.6 : 1}
                strokeDasharray={bridge ? '3 4' : b.node.keystone ? '5 4' : undefined}
              />
            );
          })}

          {PLACED.map(({ node, x, y }) => {
            const status = statusOf(node, state.unlocked, free);
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
                  fill={on ? colour : '#111433'} fillOpacity={on ? 0.24 : 1}
                  stroke={on || open ? colour : '#252A5C'}
                  strokeWidth={on ? 2.2 : open ? 1.7 : 1.1}
                  strokeDasharray={node.keystone ? '4 3' : undefined}
                  opacity={faded ? 0.4 : 1}
                />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="14.5"
                      fontFamily="'Noto Serif SC', serif"
                      fill={on ? colour : node.keystone ? '#FF5FC8' : '#E7EAFF'}
                      opacity={faded ? 0.45 : on ? 1 : 0.82}>{node.han}</text>
                {!on && (
                  <text x={x + R} y={y - R + 7} textAnchor="middle" fontSize="10"
                        fontFamily="Rajdhani, sans-serif" fontWeight="700"
                        fill={open ? '#FFCE6B' : '#7A80B8'}>{node.cost}</text>
                )}
                {picked === node.key && (
                  <circle cx={x} cy={y} r={R + 4} fill="none" stroke="#E7EAFF"
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

const WARDEN_KEYS = new Set(WARDENS.map((b) => b.key));

function countWardens(state: State): number {
  let n = 0;
  for (const [key, count] of Object.entries(state.killed)) {
    if (count > 0 && WARDEN_KEYS.has(key)) n++;
  }
  return n;
}

function Detail({ node, status, onLearn, onClose }: {
  node: Node;
  status: Status;
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
