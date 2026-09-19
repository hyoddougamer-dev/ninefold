import {
  NODE_BY_KEY, PATHS, PATH_INFO, TOTAL_COST, nodesOf, type Node, type Path,
} from '../../data/techniques.ts';
import { canUnlock, daoEarned, daoFree, daoSpent } from '../../sim/dao.ts';
import { layersOpened } from '../../sim/time.ts';
import type { State } from '../../sim/state.ts';
import { WARDENS } from '../../data/bestiary.ts';
import { icon } from '../../art/icon.ts';
import { Svg } from '../ui/Svg.tsx';

/**
 * 道 The technique tree.
 *
 * Three branches down the screen, each read top to bottom. At the middle of every branch
 * the path forks into two nodes with room for one — that fork is the whole of the
 * theorycrafting, because a keystone is always stronger than the step beside it and
 * always gives something up.
 *
 * Nobody finishes the tree. A run earns about forty-two points against the sixty-nine it
 * would cost to take everything, and the screen says so at the top rather than letting
 * the player find out at the end.
 */
export function Dao({ state, onUnlock }: {
  state: State;
  onUnlock: (key: string) => void;
}) {
  const wardensKilled = countWardens(state);
  const earned = daoEarned(layersOpened(state), wardensKilled);
  const spent = daoSpent(state.unlocked);
  const free = daoFree(layersOpened(state), wardensKilled, state.unlocked);

  return (
    <>
      <div className="row">
        <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          道 Techniques
        </span>
        <span className="mono" style={{ fontSize: 13 }}>
          <b style={{ color: free > 0 ? 'var(--gold)' : 'var(--faint)', fontSize: 18 }}>{free}</b>
          <span className="faint"> free · {spent}/{earned} spent</span>
        </span>
      </div>

      <p className="faint" style={{ fontSize: 12.5, margin: '6px 0 0' }}>
        One point per three layers, two per warden. The whole tree costs {TOTAL_COST} —
        a full run earns about 42, so you will never take all of it.
      </p>

      {PATHS.map((path) => (
        <Branch key={path} path={path} state={state} free={free} onUnlock={onUnlock} />
      ))}
    </>
  );
}

/** Points come from wardens that actually fell, so the list is read from the bestiary. */
const WARDEN_KEYS = new Set(WARDENS.map((b) => b.key));

function countWardens(state: State): number {
  let n = 0;
  for (const [key, count] of Object.entries(state.killed)) {
    if (count > 0 && WARDEN_KEYS.has(key)) n++;
  }
  return n;
}

function Branch({ path, state, free, onUnlock }: {
  path: Path;
  state: State;
  free: number;
  onUnlock: (key: string) => void;
}) {
  const info = PATH_INFO[path];
  const nodes = nodesOf(path);
  const tiers = [...new Set(nodes.map((x) => x.tier))].sort((a, b) => a - b);
  const taken = nodes.filter((x) => state.unlocked.includes(x.key)).length;

  return (
    <div className="branch" style={{ ['--hue' as string]: info.colour }}>
      <div className="bhead">
        <span className="ic"><Svg html={icon(info.icon, 26)} /></span>
        <span className="btxt">
          <b className="cjk">{info.han}</b> <em>{info.name}</em>
          <i>{info.blurb}</i>
        </span>
        <span className="bcount mono">{taken}/8</span>
      </div>

      {tiers.map((tier) => {
        const row = nodes.filter((x) => x.tier === tier);
        return (
          <div key={tier} className={row.length > 1 ? 'fork' : 'step'}>
            {row.map((node) => (
              <NodeRow key={node.key} node={node} state={state} free={free} onUnlock={onUnlock} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function NodeRow({ node, state, free, onUnlock }: {
  node: Node;
  state: State;
  free: number;
  onUnlock: (key: string) => void;
}) {
  const have = state.unlocked.includes(node.key);
  const twin = node.excludes ? NODE_BY_KEY[node.excludes] : null;
  const shut = !!twin && state.unlocked.includes(twin.key);
  const open = canUnlock(node.key, state.unlocked, free);
  const affordable = canUnlock(node.key, state.unlocked, Infinity);

  const status = have ? 'have' : shut ? 'shut' : open ? 'open' : affordable ? 'poor' : 'locked';

  return (
    <button
      className="node"
      data-status={status}
      data-keystone={node.keystone ? 'true' : undefined}
      disabled={!open}
      onClick={() => onUnlock(node.key)}
    >
      <span className="ncost mono">{have ? '✓' : node.cost}</span>
      <span className="nbody">
        <b className="cjk">{node.han}</b> <em>{node.name}</em>
        <i>{node.text}</i>
        {shut && <u>closed — you took the other side</u>}
      </span>
    </button>
  );
}
