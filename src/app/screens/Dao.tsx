import { useState } from 'react';
import { WARDENS } from '../../data/bestiary.ts';
import {
  NODE_BY_KEY, PATHS, PATH_INFO, TOTAL_COST, nodesOf, type Node, type Path,
} from '../../data/techniques.ts';
import { canUnlock, daoEarned, daoFree, daoSpent } from '../../sim/dao.ts';
import { layersOpened } from '../../sim/time.ts';
import type { State } from '../../sim/state.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from '../ui/Svg.tsx';

/**
 * 道 The technique tree, drawn as a tree.
 *
 * The first version of this screen was a list of rows, and a list is not a tree: it
 * hides the one thing the player needs to see, which is the *shape* — where the branch
 * splits, what a choice closes off, how far the end is from here. So the branch is drawn
 * as a trunk of nodes with a real fork in the middle, and tapping a node opens its
 * detail underneath rather than spelling every node out at once.
 */

const R = 21;          // node radius
const GAP = 74;        // vertical distance between tiers
const SPREAD = 62;     // how far the fork's two nodes sit from the trunk
const W = 300;
const CX = W / 2;

type Status = 'have' | 'open' | 'poor' | 'shut' | 'locked';

function statusOf(node: Node, unlocked: readonly string[], free: number): Status {
  if (unlocked.includes(node.key)) return 'have';
  const twin = node.excludes ? NODE_BY_KEY[node.excludes] : null;
  if (twin && unlocked.includes(twin.key)) return 'shut';
  if (canUnlock(node.key, unlocked, free)) return 'open';
  if (canUnlock(node.key, unlocked, Infinity)) return 'poor';
  return 'locked';
}

/** Where every node of a branch sits. Tier 5 forks; everything else rides the trunk. */
function layout(path: Path): { node: Node; x: number; y: number }[] {
  const nodes = nodesOf(path);
  const byTier = new Map<number, Node[]>();
  for (const n of nodes) {
    if (!byTier.has(n.tier)) byTier.set(n.tier, []);
    byTier.get(n.tier)!.push(n);
  }
  const out: { node: Node; x: number; y: number }[] = [];
  for (const [tier, row] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
    const y = R + 10 + tier * GAP;
    if (row.length === 1) out.push({ node: row[0], x: CX, y });
    else row.forEach((node, i) => out.push({ node, x: CX + (i === 0 ? -SPREAD : SPREAD), y }));
  }
  return out;
}

export function Dao({ state, onUnlock }: {
  state: State;
  onUnlock: (key: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const wardens = countWardens(state);
  const earned = daoEarned(layersOpened(state), wardens);
  const spent = daoSpent(state.unlocked);
  const free = daoFree(layersOpened(state), wardens, state.unlocked);
  const chosen = picked ? NODE_BY_KEY[picked] : null;

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          道 Techniques
        </span>
        <span className="mono" style={{ fontSize: 13 }}>
          <b style={{ color: free > 0 ? 'var(--gold)' : 'var(--faint)', fontSize: 19 }}>{free}</b>
          <span className="faint"> free · {spent}/{earned}</span>
        </span>
      </div>

      <p className="faint" style={{ fontSize: 12.5, margin: '6px 0 2px' }}>
        A point per three layers, two per warden. The whole tree costs {TOTAL_COST} and a
        run earns about 42 — you will never take all of it. Tap a node to read it.
      </p>

      {chosen && (
        <Detail
          node={chosen}
          status={statusOf(chosen, state.unlocked, free)}
          onLearn={() => { onUnlock(chosen.key); setPicked(null); }}
          onClose={() => setPicked(null)}
        />
      )}

      {PATHS.map((path) => (
        <Branch
          key={path}
          path={path}
          state={state}
          free={free}
          picked={picked}
          onPick={setPicked}
        />
      ))}
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

function Branch({ path, state, free, picked, onPick }: {
  path: Path;
  state: State;
  free: number;
  picked: string | null;
  onPick: (key: string) => void;
}) {
  const info = PATH_INFO[path];
  const placed = layout(path);
  const height = Math.max(...placed.map((p) => p.y)) + R + 12;
  const taken = placed.filter((p) => state.unlocked.includes(p.node.key)).length;

  // A limb runs from every node to every node of the tier below it, so the fork opens
  // into two and closes back into one without any special-casing.
  const limbs: { a: typeof placed[number]; b: typeof placed[number] }[] = [];
  for (const p of placed) {
    for (const q of placed) {
      if (q.node.tier === p.node.tier + 1) limbs.push({ a: p, b: q });
    }
  }

  return (
    <div className="limb" style={{ ['--hue' as string]: info.colour }}>
      <div className="lhead">
        <span className="ic"><Svg html={icon(info.icon, 24)} /></span>
        <span className="ltxt">
          <b className="cjk">{info.han}</b> <em>{info.name}</em>
          <i>{info.blurb}</i>
        </span>
        <span className="lcount mono">{taken}/8</span>
      </div>

      <svg viewBox={`0 0 ${W} ${height}`} className="treesvg" role="img"
           aria-label={`${info.name} branch, ${taken} of 8 taken`}>
        {limbs.map(({ a, b }) => {
          const lit = state.unlocked.includes(a.node.key) && state.unlocked.includes(b.node.key);
          const dead = statusOf(b.node, state.unlocked, free) === 'shut';
          return (
            <line
              key={`${a.node.key}-${b.node.key}`}
              x1={a.x} y1={a.y + R} x2={b.x} y2={b.y - R}
              stroke={lit ? info.colour : '#252A5C'}
              strokeWidth={lit ? 2.4 : 1.4}
              strokeOpacity={dead ? 0.25 : 1}
              strokeDasharray={b.node.keystone ? '5 4' : undefined}
            />
          );
        })}

        {placed.map(({ node, x, y }) => {
          const status = statusOf(node, state.unlocked, free);
          const on = status === 'have';
          const open = status === 'open';
          return (
            <g key={node.key} className="tnode" data-status={status}
               onClick={() => onPick(node.key)} style={{ cursor: 'pointer' }}>
              {open && <circle cx={x} cy={y} r={R + 6} fill={info.colour} fillOpacity=".12" />}
              <circle
                cx={x} cy={y} r={R}
                fill={on ? info.colour : '#111433'}
                fillOpacity={on ? 0.22 : 1}
                stroke={on || open ? info.colour : '#252A5C'}
                strokeWidth={on ? 2.4 : open ? 1.8 : 1.2}
                strokeDasharray={node.keystone ? '4 3' : undefined}
                opacity={status === 'locked' || status === 'shut' ? 0.4 : 1}
              />
              <text
                x={x} y={y + 6} textAnchor="middle" fontSize="18"
                fontFamily="'Noto Serif SC', serif"
                fill={on ? info.colour : node.keystone ? '#FF5FC8' : '#E7EAFF'}
                opacity={status === 'locked' || status === 'shut' ? 0.45 : on ? 1 : 0.8}
              >{node.han}</text>
              {!on && (
                <text x={x + R - 2} y={y - R + 6} textAnchor="middle" fontSize="11"
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
  );
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
        <p className="faint" style={{ margin: '6px 0 0', fontSize: 12.5 }}>
          A keystone: stronger than the node beside it, and it gives something up.
        </p>
      )}
      {twin && (
        <p className="faint" style={{ margin: '5px 0 0', fontSize: 12.5 }}>
          {status === 'shut'
            ? <>Closed — you took <span className="cjk">{twin.han}</span> instead.</>
            : <>Taking this closes <span className="cjk">{twin.han}</span> {twin.name} for good.</>}
        </p>
      )}
      <div className="row" style={{ marginTop: 11 }}>
        <span className="mono faint" style={{ fontSize: 12.5 }}>
          {status === 'have' ? 'learned' : `costs ${node.cost} 道`}
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
