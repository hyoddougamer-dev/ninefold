import { useState } from 'react';
import { setSoundMuted, setSoundVolume, sfx, soundVolume } from '../sound.ts';
import { musicVolume, setMusicMuted, setMusicVolume } from '../music.ts';
import { MENU } from '../copy.ts';

/**
 * 量 The sound and the music, each a slider from 0 to 100 and a mute beside it, in the
 * menu where the two three-step buttons were. rekaris, on the Discord: *"quiet"* was
 * still loud. The level is remembered on the device; the mute keeps it to come back to.
 *
 * The sound's slider plays a tap when it is let go, so the level can be heard as it is
 * chosen. The music's needs nothing: it is already playing.
 */
export function Volumes() {
  const [snd, setSnd] = useState(soundVolume);
  const [mus, setMus] = useState(musicVolume);
  return (
    <div className="volumes" data-qol="volumes">
      <Row han="音" label={MENU.sound} level={snd}
        onLevel={(n) => { setSoundVolume(n); setSnd(soundVolume()); }}
        onLetGo={() => sfx.tap()}
        onMute={() => { setSoundMuted(!snd.muted); setSnd(soundVolume()); if (snd.muted) sfx.tap(); }} />
      <Row han="樂" label={MENU.music} level={mus}
        onLevel={(n) => { setMusicVolume(n); setMus(musicVolume()); }}
        onMute={() => { setMusicMuted(!mus.muted); setMus(musicVolume()); sfx.tap(); }} />
    </div>
  );
}

function Row({ han, label, level, onLevel, onLetGo, onMute }: {
  han: string;
  label: string;
  level: { pct: number; muted: boolean };
  onLevel: (n: number) => void;
  onLetGo?: () => void;
  onMute: () => void;
}) {
  const silent = level.muted || level.pct === 0;
  return (
    <div className="vol" data-on={!silent}>
      <button type="button" className="vmute" aria-pressed={level.muted}
        aria-label={level.muted ? MENU.unmute(label) : MENU.mute(label)} title={level.muted ? MENU.unmute(label) : MENU.mute(label)}
        onClick={onMute}>
        <b className="cjk">{han}</b>
        {silent && <i aria-hidden="true" />}
      </button>
      <label className="vlabel">
        <span>{label}</span>
        <input type="range" min={0} max={100} step={5} value={level.pct}
          aria-label={MENU.volumeOf(label)} aria-valuetext={silent ? MENU.off : `${level.pct}`}
          style={{ ['--v' as string]: `${level.muted ? 0 : level.pct}%` }}
          onChange={(e) => onLevel(Number(e.currentTarget.value))}
          onPointerUp={onLetGo} onKeyUp={onLetGo} />
      </label>
      <em className="mono">{silent ? MENU.off : level.pct}</em>
    </div>
  );
}
