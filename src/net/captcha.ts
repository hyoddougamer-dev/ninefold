/**
 * 盾 A captcha answer for signing in, or nothing when the game has no site key.
 *
 * Guests are an account a tap away, and an account a tap away is an account a script can
 * make ten thousand of. The server bounds what any one of them can rank (sim/verify.ts),
 * and limits how many one address may make in an hour; this is the third fence, and it
 * only stands once the keys exist. hCaptcha's own script is loaded the first time it is
 * needed and never before, the same rule supabase-js keeps.
 *
 * The widget is invisible: most players never see it, and a player who looks like a
 * script is shown a challenge in hCaptcha's own box.
 */
import { HCAPTCHA_SITEKEY } from './config.ts';

interface HCaptcha {
  render(el: HTMLElement, o: { sitekey: string; size: 'invisible' }): string;
  execute(id: string, o: { async: true }): Promise<{ response: string }>;
  reset(id: string): void;
}
declare global { interface Window { hcaptcha?: HCaptcha } }

let ready: Promise<HCaptcha> | null = null;
let widget: string | null = null;

function load(): Promise<HCaptcha> {
  ready ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    s.async = true;
    s.onload = () => (window.hcaptcha ? resolve(window.hcaptcha) : reject(new Error('captcha')));
    s.onerror = () => { ready = null; reject(new Error('captcha')); };
    document.head.appendChild(s);
  });
  return ready;
}

/** A fresh, single-use answer, or undefined when there is no captcha to answer. */
export async function captchaToken(): Promise<string | undefined> {
  if (!HCAPTCHA_SITEKEY || typeof document === 'undefined') return undefined;
  const h = await load();
  if (widget === null) {
    const box = document.createElement('div');
    box.className = 'hcapbox';
    document.body.appendChild(box);
    widget = h.render(box, { sitekey: HCAPTCHA_SITEKEY, size: 'invisible' });
  } else {
    h.reset(widget);
  }
  const { response } = await h.execute(widget, { async: true });
  return response;
}
