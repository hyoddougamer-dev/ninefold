import { systemInfo, type System } from '../../sim/unlocks.ts';
import { realm as realmInfo } from '../../data/realms.ts';
import { LOCKED } from '../copy.ts';

/** A system whose gate is still shut: what it is, the realm that opens it, and a way back. */
export function LockedSystem({ system, onBack }: {
  system: System;
  onBack: () => void;
}) {
  return (
    <div className="shut" onClick={onBack}>
      <b className="cjk" style={{ color: realmInfo(systemInfo(system).realm).colour }}>
        {systemInfo(system).han}
      </b>
      <em>{systemInfo(system).name}</em>
      <i>{systemInfo(system).gives}</i>
      <p>{LOCKED.opensAt(
        realmInfo(systemInfo(system).realm).han,
        realmInfo(systemInfo(system).realm).name,
        systemInfo(system).realm,
      )}</p>
      <button className="act" onClick={onBack}>續 <span>{LOCKED.back}</span></button>
    </div>
  );
}
