/**
 * 器靈 The Artifact Spirit: the light a Hundredfold set worn whole at Heaven wakes around
 * the cultivator. Looks only (sim/hundred.ts spiritOf); nothing reads it but the screen.
 *
 * Drawn the way the worn rim is (art/gear.ts wornRim): rings in the set's colour, so it sits
 * over the same portrait without a new kind of picture. Eight leaves of light turn on the
 * outer ring, and a second ring pulses inside it; asleep, it is one dashed ring in the
 * line colour, so the page can show what is waiting.
 */
const f = (x: number) => x.toFixed(1);

export function spiritRim(colour: string, S: number, awake = true): string {
  const c = S / 2;
  if (!awake) {
    return `<circle cx="${c}" cy="${c}" r="${f(S * 0.44)}" fill="none" stroke="${colour}" stroke-width="1.2" stroke-dasharray="3 4"/>`;
  }
  const leaves = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const r1 = S * 0.41, r2 = S * 0.5;
    const x1 = c + Math.cos(a) * r1, y1 = c + Math.sin(a) * r1;
    const x2 = c + Math.cos(a) * r2, y2 = c + Math.sin(a) * r2;
    const nx = -Math.sin(a) * S * 0.04, ny = Math.cos(a) * S * 0.04;
    return `<path d="M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2 + nx)} ${f((y1 + y2) / 2 + ny)} ${f(x2)} ${f(y2)} `
      + `Q${f((x1 + x2) / 2 - nx)} ${f((y1 + y2) / 2 - ny)} ${f(x1)} ${f(y1)}Z" fill="${colour}" fill-opacity=".9"/>`;
  }).join('');
  return `<circle cx="${c}" cy="${c}" r="${f(S * 0.45)}" fill="none" stroke="${colour}" stroke-width="${f(S * 0.06)}" stroke-opacity=".16"/>`
    + `<g class="spirit-turn" style="transform-origin:${c}px ${c}px">${leaves}</g>`
    + `<circle cx="${c}" cy="${c}" r="${f(S * 0.43)}" fill="none" stroke="${colour}" stroke-width="1.6" stroke-opacity=".9"/>`
    + `<circle class="spirit-pulse" cx="${c}" cy="${c}" r="${f(S * 0.39)}" fill="none" stroke="${colour}" stroke-width="3" `
    + `stroke-opacity=".35" style="transform-origin:${c}px ${c}px"/>`;
}
