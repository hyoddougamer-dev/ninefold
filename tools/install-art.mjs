/**
 * 裝 The two ways onto an Android phone, drawn step by step: installing the game from
 * Chrome, and the APK (in its zip). Four phones a way, each showing the one thing to tap,
 * with the caption under it and the honest small print along the bottom.
 *
 *     node tools/install-art.mjs      → public/discord/install/<way>-<lang>.webp
 *
 * The phones are drawings of Chrome, the Files app and Android's own prompts, not
 * screenshots (nothing here can run a real Android), and the small print says so. What
 * sits inside them is real: the game's own screen and its own icon.
 * English for Discord, Portuguese for the testers' page.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/install';
mkdirSync(OUT, { recursive: true });

const SITE = 'hyoddougamer-dev.github.io/ninefold';
const G = '#D4AF56';

const T = {
  en: {
    app: {
      over: 'Way 1 · recommended', title: 'Install it from Chrome',
      sub: 'No file to download. The same game, full screen, with its own icon.',
      steps: [
        ['Open the game in Chrome', `Go to ${SITE} and tap ⋮ at the top right.`],
        ['Tap Install app', 'On some phones it reads Add to Home screen.'],
        ['Confirm', 'Tap Install. Chrome puts it on your home screen.'],
        ['Play from your home screen', 'It opens full screen and updates itself.'],
      ],
      fine: 'Drawings of Chrome on Android: menus differ a little between phones and versions. Email sign-in works here, and the save is the same one Chrome keeps for the game.',
    },
    apk: {
      over: 'Way 2 · a file', title: 'The APK, in a zip',
      sub: 'For anyone who wants a real app file. The zip gets past phones where an .apk stops at 100%.',
      steps: [
        ['Download the zip', 'Tap the zip link in #guides. When it ends, tap Open, or find it in Files → Downloads.'],
        ['Tap ninefold.apk inside', 'Your Files app opens the zip. Tap the APK.'],
        ['Allow this source, once', 'Android asks: tap Settings, turn on Allow from this source, go back.'],
        ['Install, then Open', 'The game inside updates itself. This file only changes when we say so.'],
      ],
      fine: 'A test build shared here, not from Google Play, so Android calls it an unknown app: that is expected. Download it only from this server\'s links. In Brazil, Indonesia, Singapore and Thailand Android may refuse it: use Way 1. The APK plays as a guest and keeps its own save.',
    },
    ui: { install: 'Install app', add: 'Add to Home screen', menu: ['New tab', 'New Incognito tab', 'History', 'Downloads', 'Bookmarks', 'Share…', 'Find in page'],
      desk: 'Desktop site', dlg: 'Install app', cancel: 'Cancel', inst: 'Install', done: 'Download complete', open: 'Open',
      files: 'Files', unknown: 'For your security, your phone currently isn\'t allowed to install unknown apps from this source. You can change this in Settings.',
      settings: 'Settings', unknownTitle: 'Install unknown apps', allow: 'Allow from this source', q: 'Do you want to install this app?' },
  },
  pt: {
    app: {
      over: 'Opção 1 · recomendada', title: 'Instalar pelo Chrome',
      sub: 'Sem ficheiro para descarregar. O mesmo jogo, em ecrã inteiro, com ícone próprio.',
      steps: [
        ['Abre o jogo no Chrome', `Vai a ${SITE} e toca em ⋮ no canto superior direito.`],
        ['Toca em Instalar app', 'Em alguns telemóveis diz Adicionar ao ecrã principal.'],
        ['Confirma', 'Toca em Instalar. O Chrome põe-no no ecrã principal.'],
        ['Joga a partir do ecrã principal', 'Abre em ecrã inteiro e atualiza-se sozinho.'],
      ],
      fine: 'Desenhos do Chrome no Android: os menus mudam um pouco entre telemóveis e versões. Aqui dá para entrar com email, e o save é o mesmo que o Chrome guarda para o jogo.',
    },
    apk: {
      over: 'Opção 2 · um ficheiro', title: 'O APK, num zip',
      sub: 'Para quem quer mesmo o ficheiro da app. O zip passa nos telemóveis onde um .apk fica parado nos 100%.',
      steps: [
        ['Descarrega o zip', 'Toca no link do zip. Quando acabar, toca em Abrir, ou procura em Ficheiros → Transferências.'],
        ['Toca em ninefold.apk', 'A app Ficheiros abre o zip. Toca no APK.'],
        ['Permite esta origem, uma vez', 'O Android pergunta: toca em Definições, liga Permitir desta origem e volta.'],
        ['Instala e abre', 'O jogo lá dentro atualiza-se sozinho. Este ficheiro só muda quando avisarmos.'],
      ],
      fine: 'Uma versão de teste partilhada aqui, não vem da Google Play, por isso o Android chama-lhe app desconhecida: é normal. Descarrega só pelos nossos links. No Brasil, Indonésia, Singapura e Tailândia o Android pode recusá-la: usa a opção 1. O APK joga como convidado e tem o seu próprio save.',
    },
    ui: { install: 'Instalar app', add: 'Adicionar ao ecrã principal', menu: ['Novo separador', 'Novo separador anónimo', 'Histórico', 'Transferências', 'Marcadores', 'Partilhar…', 'Procurar na página'],
      desk: 'Site para computador', dlg: 'Instalar app', cancel: 'Cancelar', inst: 'Instalar', done: 'Transferência concluída', open: 'Abrir',
      files: 'Ficheiros', unknown: 'Por motivos de segurança, o telemóvel não tem autorização para instalar apps desconhecidas desta origem. Pode alterar esta opção nas Definições.',
      settings: 'Definições', unknownTitle: 'Instalar apps desconhecidas', allow: 'Permitir desta origem', q: 'Quer instalar esta app?' },
  },
};

const roboto = () => {
  const css = execFileSync('curl', ['-sSL', '--max-time', '30', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap'], { encoding: 'utf8' });
  return css.replace(/\/\*\s*(cyrillic|vietnamese|latin-ext|greek)[\s\S]*?\}\s*/g, '')
    .replace(/url\((https:[^)]+)\)/g, (_, u) => `url(data:font/woff2;base64,${execFileSync('curl', ['-sSL', '--max-time', '30', u]).toString('base64')})`);
};

const game = data('public/discord/cultivate.webp');
const icon = `data:image/png;base64,${(await sharp('public/icon-192.png').png().toBuffer()).toString('base64')}`;
const wall = data('public/art/realm/2.webp');

const statusbar = '<div class="sb"><span>9:41</span><span>▾ ▴ ▮</span></div>';
const chromebar = (dots = false) => `<div class="cb"><div class="omni"><span class="lock">🔒</span>${SITE}</div><div class="dots${dots ? ' hot' : ''}">⋮</div></div>`;
const ring = (x, y) => `<div class="ring" style="left:${x}px;top:${y}px"></div>`;

function phones(way, u) {
  if (way === 'app') return [
    `${statusbar}${chromebar(true)}<img class="scr" src="${game}">${ring(238, 30)}`,
    `${statusbar}${chromebar()}<img class="scr dim" src="${game}"><div class="menu">
      ${u.menu.map((m) => `<div class="mi">${m}</div>`).join('')}
      <div class="mi hot">⊕ ${u.install}</div><div class="mi">${u.desk}</div></div>
      <div class="alt">${u.add}</div>`,
    `${statusbar}${chromebar()}<img class="scr dim" src="${game}"><div class="dlg">
      <div class="dt">${u.dlg}</div><div class="drow"><img src="${icon}"><div><b>九境 Ninefold</b><small>${SITE.split('/')[0]}</small></div></div>
      <div class="btns"><span>${u.cancel}</span><span class="hot">${u.inst}</span></div></div>`,
    `${statusbar}<div class="home"><div class="grid">${Array.from({ length: 11 }, () => '<i></i>').join('')}
      <div class="app"><img src="${icon}"><span>Ninefold</span></div></div></div>`,
  ];
  return [
    `${statusbar}${chromebar()}<div class="page"><div class="pl"></div><div class="pl s"></div><div class="pl"></div></div>
      <div class="dl"><div><b>${u.done}</b><small>ninefold-android.zip · 17.4 MB</small></div><span class="hot">${u.open}</span></div>`,
    `${statusbar}<div class="fbar">${u.files}</div><div class="crumb">ninefold-android.zip</div>
      <div class="frow hot"><span class="apk">APK</span><div><b>ninefold.apk</b><small>17.4 MB</small></div></div>`,
    `${statusbar}<div class="fbar">${u.files}</div><div class="shade"></div><div class="dlg top">
      <div class="dp">${u.unknown}</div><div class="btns"><span>${u.cancel}</span><span class="hot">${u.settings}</span></div></div>
      <div class="then">↓</div><div class="set"><div class="st">${u.unknownTitle}</div><div class="tog hot">${u.allow}<i></i></div></div>`,
    `${statusbar}<div class="fbar">${u.files}</div><div class="shade"></div><div class="dlg low">
      <div class="drow"><img src="${icon}"><div><b>Ninefold</b><small>${u.q}</small></div></div>
      <div class="btns"><span>${u.cancel}</span><span class="hot">${u.inst}</span></div></div>`,
  ];
}

function page(way, lang, css) {
  const t = T[lang][way], u = T[lang].ui;
  return `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; } body { margin: 0; background: #0D0B08; }
  .c { width: 1800px; height: 1120px; position: relative; overflow: hidden; color: #EDE3D2;
       background: radial-gradient(ellipse at 50% 0%, rgba(212,175,86,.10), transparent 60%), #0D0B08; }
  .frame { position: absolute; inset: 22px; border: 1px solid rgba(212,175,86,.38); pointer-events: none; }
  .head { position: absolute; left: 80px; right: 80px; top: 62px; display: flex; align-items: center; gap: 28px; }
  .seal { width: 96px; height: 96px; flex: none; display: grid; place-items: center; border: 2px solid ${G}; border-radius: 6px;
          box-shadow: inset 0 0 0 5px #0D0B08, inset 0 0 0 6px rgba(212,175,86,.45); font: 600 58px/1 'Noto Serif SC', serif; color: #E2C26A; }
  .over { font: 600 16px/1 Cinzel, serif; letter-spacing: .3em; text-transform: uppercase; color: #8FB49B; }
  h1 { margin: 10px 0 8px; font: 700 50px/1.05 Cinzel, serif; color: #F3E8CF; }
  .sub { font: italic 600 27px/1.2 'Cormorant Garamond', serif; color: #CDB67F; }
  .row { position: absolute; left: 80px; right: 80px; top: 215px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; }
  .step { display: flex; flex-direction: column; align-items: center; gap: 22px; }
  .phone { width: 300px; height: 580px; border-radius: 36px; background: #111; border: 9px solid #2A2621; position: relative; overflow: hidden;
           box-shadow: 0 0 0 1px rgba(212,175,86,.35), 0 24px 50px rgba(0,0,0,.6); font-family: Roboto, sans-serif; }
  .sb { height: 24px; display: flex; justify-content: space-between; padding: 4px 16px 0; font: 500 12px Roboto, sans-serif; color: #ddd; background: #1F1F1F; }
  .cb { height: 50px; background: #1F1F1F; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 10px; }
  .omni { flex: 1; height: 34px; border-radius: 17px; background: #2E2E2E; color: #ccc; font: 400 12.5px/34px Roboto, sans-serif; padding: 0 12px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lock { font-size: 10px; margin-right: 6px; opacity: .7; }
  .dots { width: 30px; text-align: center; font: 500 24px/1 Roboto, sans-serif; color: #eee; }
  .scr { display: block; width: 100%; height: calc(100% - 74px); object-fit: cover; object-position: top; }
  .dim { filter: brightness(.35); }
  .ring { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 3px solid ${G}; box-shadow: 0 0 0 6px rgba(212,175,86,.25), 0 0 24px rgba(212,175,86,.6); }
  .hot { outline: 3px solid ${G}; outline-offset: -3px; box-shadow: 0 0 22px rgba(212,175,86,.55); color: #F3E8CF !important; background: rgba(212,175,86,.18) !important; }
  .menu { position: absolute; right: 8px; top: 30px; width: 214px; background: #2B2B2B; border-radius: 10px; padding: 6px 0; box-shadow: 0 10px 30px rgba(0,0,0,.6); }
  .mi { font: 400 14px/1 Roboto, sans-serif; color: #ddd; padding: 12px 16px; }
  .menu .hot { font-weight: 500; border-radius: 6px; margin: 2px 6px; padding: 12px 10px; }
  .alt { position: absolute; left: 12px; right: 12px; bottom: 14px; padding: 8px 6px; border-radius: 10px; background: rgba(13,11,8,.92); border: 1px solid rgba(212,175,86,.4); text-align: center; font: italic 600 19px 'Cormorant Garamond', serif; color: #CDB67F; }
  .alt::before { content: '≈ '; }
  .dlg { position: absolute; left: 16px; right: 16px; top: 190px; background: #2B2B2B; border-radius: 22px; padding: 22px 20px 16px; box-shadow: 0 16px 40px rgba(0,0,0,.7); color: #eee; }
  .dlg.low { top: 170px; } .dlg.top { top: 92px; padding-top: 18px; }
  .then { position: absolute; left: 0; right: 0; top: 318px; text-align: center; font: 700 28px Roboto, sans-serif; color: ${G}; }
  .set { position: absolute; left: 12px; right: 12px; top: 362px; background: #1F1F1F; border-radius: 16px; padding: 14px 12px; }
  .st { font: 400 16px Roboto, sans-serif; color: #eee; margin-bottom: 4px; }
  .set .tog { margin-top: 8px; padding: 10px; border-radius: 10px; }
  .dt { font: 400 20px Roboto, sans-serif; margin-bottom: 16px; }
  .dp { font: 400 14px/1.45 Roboto, sans-serif; color: #ddd; }
  .drow { display: flex; gap: 12px; align-items: center; }
  .drow img { width: 48px; height: 48px; border-radius: 12px; }
  .drow b { display: block; font: 500 16px Roboto, sans-serif; } .drow small { font: 400 12.5px Roboto, sans-serif; color: #aaa; }
  .btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; font: 500 14px Roboto, sans-serif; color: #A8C7FA; }
  .btns span { padding: 10px 14px; border-radius: 18px; }
  .tog { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; font: 400 14px Roboto, sans-serif; color: #ddd; }
  .tog i { width: 40px; height: 22px; border-radius: 11px; background: #A8C7FA; position: relative; box-shadow: 0 0 0 3px ${G}; }
  .tog i::after { content: ''; position: absolute; right: 3px; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #0B1F3A; }
  .home { position: absolute; inset: 24px 0 0; background: linear-gradient(rgba(10,8,6,.55), rgba(10,8,6,.75)), url(${wall}) center / cover; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px 0; padding: 70px 14px; justify-items: center; }
  .grid i { width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,.14); }
  .app { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .app img { width: 54px; height: 54px; border-radius: 50%; box-shadow: 0 0 0 3px ${G}, 0 0 26px rgba(212,175,86,.8); }
  .app span { font: 500 12px Roboto, sans-serif; color: #fff; }
  .page { padding: 24px 18px; } .pl { height: 14px; border-radius: 7px; background: #2A2A2A; margin: 14px 0; } .pl.s { width: 60%; }
  .dl { position: absolute; left: 10px; right: 10px; bottom: 16px; background: #2B2B2B; border-radius: 14px; padding: 14px 14px; display: flex; align-items: center; justify-content: space-between; color: #eee; }
  .dl b { display: block; font: 500 14px Roboto, sans-serif; } .dl small { font: 400 12px Roboto, sans-serif; color: #aaa; }
  .dl span { font: 500 14px Roboto, sans-serif; color: #A8C7FA; padding: 10px 14px; border-radius: 16px; }
  .fbar { height: 56px; background: #1F1F1F; font: 400 21px/56px Roboto, sans-serif; color: #eee; padding: 0 18px; }
  .crumb { font: 500 13px Roboto, sans-serif; color: #A8C7FA; padding: 14px 18px; }
  .frow { display: flex; gap: 14px; align-items: center; margin: 4px 10px; padding: 12px 10px; border-radius: 12px; color: #eee; }
  .frow b { display: block; font: 500 15px Roboto, sans-serif; } .frow small { font: 400 12px Roboto, sans-serif; color: #aaa; }
  .apk { width: 42px; height: 42px; border-radius: 10px; background: #3DDC84; color: #0B2A17; font: 700 11px/42px Roboto, sans-serif; text-align: center; }
  .shade { position: absolute; inset: 80px 0 0; background: rgba(0,0,0,.45); }
  .cap { text-align: center; max-width: 330px; }
  .n { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${G}; color: #E2C26A; font: 700 20px Cinzel, serif; margin-bottom: 12px; }
  .cap h2 { margin: 0 0 8px; font: 700 23px/1.15 Cinzel, serif; color: #F3E8CF; }
  .cap p { margin: 0; font: italic 600 21px/1.25 'Cormorant Garamond', serif; color: #CDB67F; }
  .fine { position: absolute; left: 80px; right: 80px; bottom: 50px; padding-top: 18px; border-top: 1px solid rgba(212,175,86,.3);
          font: 400 17px/1.45 Roboto, sans-serif; color: #A99F8C; }
  .fine b { color: ${G}; font-weight: 500; }
  </style>
  <div class="c"><div class="frame"></div>
    <div class="head"><div class="seal">裝</div><div><div class="over">${t.over}</div><h1>${t.title}</h1><div class="sub">${t.sub}</div></div></div>
    <div class="row">${phones(way, u).map((ph, i) => `<div class="step"><div class="phone">${ph}</div>
      <div class="cap"><span class="n">${i + 1}</span><h2>${t.steps[i][0]}</h2><p>${t.steps[i][1]}</p></div></div>`).join('')}</div>
    <div class="fine"><b>ⓘ</b> ${t.fine}</div>
  </div>`;
}

const css = fonts('裝九境') + roboto();
const browser = await chromium.launch({ executablePath: CHROME });
const tab = await browser.newPage({ viewport: { width: 1800, height: 1120 } });
for (const lang of ['en', 'pt']) for (const way of ['app', 'apk']) {
  await tab.setContent(page(way, lang, css));
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(200);
  // Nothing may spill: every caption and the small print sit inside the canvas.
  const over = await tab.evaluate(() => [...document.querySelectorAll('.cap, .fine, .head')]
    .filter((e) => e.getBoundingClientRect().bottom > (e.classList.contains('cap') ? document.querySelector('.fine').getBoundingClientRect().top - 8 : 1100) || e.scrollWidth > e.clientWidth + 1).length);
  if (over) throw new Error(`${way}-${lang}: ${over} blocks spill out of the canvas`);
  const png = await tab.screenshot({ clip: { x: 0, y: 0, width: 1800, height: 1120 } });
  await sharp(png).webp({ quality: 86 }).toFile(`${OUT}/${way}-${lang}.webp`);
  console.log(`  ${way}-${lang}`);
}
await browser.close();
console.log(`裝 4 install guides in ${OUT}.`);
