/**
 * 訣 Four ways to do combat arts.
 *
 * The question behind all four: the fight is the only system in the game with no
 * decision in it. You pick a beast, you watch, you win or you lose, and everything was
 * already settled before you pressed anything. Gear has a decision. The tree has one.
 * The sets have one. Combat has none.
 *
 * What none of them may do is put a button in the fight. "Automatic combat that you
 * watch" is the premise, and an idle game that needs you present stops being one. So
 * every proposal here makes its choice *before* the fight and then gets out of the way.
 *
 * They all share one hook, because it costs nothing and pays twice: **each warden
 * drops its own art**. Nine arts, one a realm, arriving at a known pace, and the
 * warden fight stops being only a gate.
 *
 * The copy is European Portuguese: it is written for Bruno, not for the game.
 */
import { writeFileSync } from 'node:fs';
import { WARDENS } from '../src/data/bestiary.ts';
import { realm as realmOf } from '../src/data/realms.ts';
import { icon } from '../src/art/icon.ts';

interface Art {
  readonly realm: number;
  readonly han: string;
  readonly name: string;
  readonly icon: string;
  /** What it does, in one line a player can hold in their head. */
  readonly text: string;
  /** When it would fire, if the design has triggers. */
  readonly when: string;
  /** What kind of build it wants. */
  readonly wants: string;
}

const ARTS: readonly Art[] = [
  { realm: 1, han: '狐影', name: 'Fox Shadow', icon: 'fox-head',
    text: '1 blow in 5 misses you entirely', when: 'always', wants: 'long fights' },
  { realm: 2, han: '猿臂', name: 'Ape Arm', icon: 'monkey',
    text: 'your first strike hits for +35%', when: 'round 1', wants: 'short fights' },
  { realm: 3, han: '鶴唳', name: 'Crane Cry', icon: 'heron',
    text: 'the beast loses 6% power every round, stacking', when: 'every round', wants: 'long fights' },
  { realm: 4, han: '虎嘯', name: 'Tiger Roar', icon: 'tiger-head',
    text: 'every third strike hits twice', when: 'rounds 3, 6, 9…', wants: 'raw power' },
  { realm: 5, han: '龜息', name: 'Turtle Breath', icon: 'turtle',
    text: 'below half health you take 30% less', when: 'under 50% health', wants: 'fights you nearly lose' },
  { realm: 6, han: '傀儡', name: 'Puppet Thread', icon: 'golem-head',
    text: 'a quarter of what you take is dealt back', when: 'always', wants: 'heavy hitters' },
  { realm: 7, han: '狼噬', name: 'Wolf Bite', icon: 'direwolf',
    text: '+8% damage for every round already fought', when: 'every round', wants: 'long fights' },
  { realm: 8, han: '蛟騰', name: 'Serpent Rise', icon: 'sea-serpent',
    text: 'your first strike under 30% health hits for triple', when: 'under 30% health', wants: 'a gamble' },
  { realm: 9, han: '龍威', name: 'Dragon Might', icon: 'spiked-dragon-head',
    text: '+20% damage, and the beast’s first blow misses', when: 'always', wants: 'everything' },
];

/** Which warden hands it over. The art wears its own beast's icon, so the link is seen. */
const wardenOfArt = (realm: number) => WARDENS.find((w) => w.realm === realm)!;

const artCard = (a: Art, opts: { lit?: boolean; note?: string; from?: boolean } = {}) => {
  const hue = realmOf(a.realm).colour;
  const w = wardenOfArt(a.realm);
  return `<div class="art${opts.lit ? ' lit' : ''}" style="--hue:${hue}">
    <span class="ic">${icon(a.icon, 26)}</span>
    <span class="body">
      <b class="cjk">${a.han}</b> <em>${a.name}</em>
      <i>${a.text}</i>
      ${opts.from ? `<span class="from">reino ${a.realm} · <span class="cjk">${w.han}</span> ${w.name}</span>` : ''}
    </span>
    ${opts.note ? `<span class="when">${opts.note}</span>` : ''}
  </div>`;
};

/**
 * 局 A fight drawn as a strip of rounds, with the arts marked where they fire.
 *
 * It is the only way to show the difference between the four at a glance: a loadout
 * scatters marks, a stance paints the whole strip, a chain lays them in order.
 */
function strip(rounds: number, marks: { round: number; han: string; hue: string }[], band?: string) {
  const cells = Array.from({ length: rounds }, (_, i) => {
    const here = marks.filter((m) => m.round === i + 1);
    return `<div class="rd">
      <span class="no">${i + 1}</span>
      ${here.map((m) => `<span class="fire cjk" style="color:${m.hue}">${m.han}</span>`).join('')}
    </div>`;
  }).join('');
  return `<div class="strip">${band ? `<div class="band">${band}</div>` : ''}${cells}</div>`;
}

const hue = (n: number) => realmOf(n).colour;

// ── A 訣 The loadout ──────────────────────────────────────────────────────────
const loadout = `
  <div class="slots">
    ${[ARTS[1], ARTS[3], ARTS[7]].map((a, i) =>
      artCard(a, { lit: true, note: ['round 1', 'every 3rd', 'under 30%'][i] })).join('')}
    <div class="art empty"><span class="body"><i>empty slot</i></span></div>
  </div>
  ${strip(9, [
    { round: 1, han: '猿', hue: hue(2) },
    { round: 3, han: '虎', hue: hue(4) },
    { round: 6, han: '虎', hue: hue(4) },
    { round: 7, han: '蛟', hue: hue(8) },
    { round: 9, han: '虎', hue: hue(4) },
  ])}`;

// ── B 脈 Arts inscribed into gear ─────────────────────────────────────────────
const meridians = `
  <div class="paper">
    ${[
      ['劍', 'Weapon', 2, ARTS[3]],
      ['袍', 'Robe', 1, ARTS[4]],
      ['冠', 'Crown', 1, null],
      ['靴', 'Boots', 0, null],
      ['珮', 'Talisman', 2, ARTS[2]],
      ['戒', 'Ring', 1, null],
    ].map(([han, name, holes, art]) => `<div class="pslot">
      <span class="ph"><b class="cjk">${han}</b> ${name}</span>
      <span class="holes">${'◆'.repeat(holes as number)}${'◇'.repeat(2 - (holes as number))}</span>
      <span class="pin">${art ? `<b class="cjk" style="color:${hue((art as Art).realm)}">${(art as Art).han}</b>` : '<i>—</i>'}</span>
    </div>`).join('')}
  </div>
  ${strip(9, [
    { round: 3, han: '虎', hue: hue(4) },
    { round: 4, han: '鶴', hue: hue(3) },
    { round: 5, han: '龜', hue: hue(5) },
    { round: 6, han: '虎', hue: hue(4) },
    { round: 9, han: '虎', hue: hue(4) },
  ])}`;

// ── C 勢 One stance, always on ────────────────────────────────────────────────
/**
 * Nine stances, one a realm, like the arts. Each is a *rule*, not a proc, and no two
 * of them want the same gear, which is where the diversity has to come from when the
 * player only gets one choice.
 */
const STANCES = [
  { han: '疾', name: 'Swift', text: 'two strikes a round, each for 60%', wants: '運 rarer gear' },
  { han: '守', name: 'Guard', text: 'take 40% less, deal 25% less', wants: '破 sunder, slow wins' },
  { han: '兇', name: 'Ferocious', text: 'deal 50% more, take 50% more', wants: '力 power, short fights' },
  { han: '纏', name: 'Entangle', text: 'the beast loses 8% power a round', wants: 'fights above your weight' },
  { han: '續', name: 'Endure', text: 'you recover 6% of your health a round', wants: '氣 qi, long fights' },
  { han: '穩', name: 'Steady', text: 'your damage never varies, no dice at all', wants: 'fights on a knife edge' },
  { han: '險', name: 'Reckless', text: 'half your blows miss, the rest hit for triple', wants: 'a gamble, 運 luck' },
  { han: '逆', name: 'Reverse', text: '+1% damage for every 1% of health you are missing', wants: 'surviving, not winning early' },
  { han: '鏡', name: 'Mirror', text: 'you deal whatever the beast dealt you last round', wants: 'beasts far above you' },
];
const stance = `
  <div class="stances">
    ${STANCES.map((s, i) => `<div class="stance${i === 2 ? ' lit' : ''}">
      <b class="cjk">${s.han}</b>
      <em>${s.name}</em>
      <i>${s.text}</i>
      <span class="wants">${s.wants}</span>
    </div>`).join('')}
  </div>
  ${strip(6, [], '兇 Ferocious · every round, both ways')}`;

// ── D 招 An ordered chain ─────────────────────────────────────────────────────
const chain = `
  <div class="chain">
    ${[ARTS[1], ARTS[2], ARTS[3], ARTS[6]].map((a, i) => `<div class="link" style="--hue:${hue(a.realm)}">
      <span class="n">${i + 1}</span>
      <span class="ic">${icon(a.icon, 22)}</span>
      <span class="body"><b class="cjk">${a.han}</b><i>${a.text}</i></span>
    </div>`).join('')}
  </div>
  ${strip(9, [
    { round: 1, han: '猿', hue: hue(2) },
    { round: 2, han: '鶴', hue: hue(3) },
    { round: 3, han: '虎', hue: hue(4) },
    { round: 4, han: '狼', hue: hue(7) },
    { round: 5, han: '猿', hue: hue(2) },
    { round: 6, han: '鶴', hue: hue(3) },
    { round: 7, han: '虎', hue: hue(4) },
    { round: 8, han: '狼', hue: hue(7) },
    { round: 9, han: '猿', hue: hue(2) },
  ])}`;

const PROPOSALS = [
  {
    key: 'a', han: '訣', name: 'A Carteira', tag: 'Três à escolha, disparam sozinhas',
    idea: 'Tens nove artes, levas três. Cada uma tem o seu momento fixo.',
    text: `A mais simples de perceber e a mais fácil de fazer. Cada arte tem um gatilho
      que nunca muda: a primeira ronda, de três em três, abaixo de 30% de vida. A
      decisão é <b>quais as três</b>, e a decisão a sério é se os gatilhos se cobrem uns
      aos outros ou se deixam buracos.`,
    space: '9 artes, 3 lugares · <b>84</b> carteiras',
    good: 'Percebe-se em cinco segundos. Cada guardiã que cai muda-te a carteira.',
    bad: 'A escolha é uma lista. Não há interacção entre as três: cada uma faz a sua coisa e ignora as outras.',
    body: loadout,
  },
  {
    key: 'b', han: '脈', name: 'Os Meridianos', tag: 'As artes gravam-se no equipamento',
    idea: 'Cada peça tem buracos. As artes entram nos buracos.',
    text: `As artes deixam de ser um ecrã à parte e passam a viver no equipamento. Uma
      arma boa com um buraco vale mais do que uma arma melhor sem nenhum, e <b>trocar de
      peça troca-te a build</b>. Os buracos vêm da raridade: 凡 nenhum, 天 dois.`,
    space: 'até 8 buracos × 9 artes · <b>milhares</b>, mas presos ao que te calha',
    good: 'A escolha mais profunda das quatro. Liga os dois sistemas que já tens em vez de acrescentar um terceiro.',
    bad: 'É o mais complicado, e a pior queda do jogo passa a ser uma peça ótima sem buracos. Contraria o «simples».',
    body: meridians,
  },
  {
    key: 'c', han: '勢', name: 'A Postura', tag: 'Uma só, sempre ligada, muda a luta toda',
    idea: 'Não é um disparo. É uma regra diferente para todas as rondas.',
    text: `Escolhes <b>uma</b> e ela reescreve o combate: 疾 bates duas vezes por ronda
      mas mais fraco, 守 levas menos e dás menos, 兇 dás muito mais e levas muito mais.
      Uma decisão só, com consequência enorme e imediatamente legível, e cada postura
      quer um equipamento diferente.`,
    space: '9 posturas · <b>9</b> escolhas, e cada uma pede outra build de equipamento',
    good: 'A mais legível de longe. Dizer «ando de 兇» descreve a tua personagem numa palavra.',
    bad: 'Só uma escolha. A diversidade tem de vir toda do equipamento e da árvore.',
    body: stance,
  },
  {
    key: 'd', han: '招', name: 'A Sequência', tag: 'Quatro artes por ordem, em ciclo',
    idea: 'Uma arte por ronda, pela ordem que puseres, a repetir.',
    text: `Não escolhes só quais. Escolhes <b>a ordem</b>. E a ordem conta, porque umas
      preparam as outras: o 鶴唳 tira poder à besta, por isso vale mais cedo; o 虎嘯 bate
      a dobrar, por isso vale depois do 狼噬 já ter empilhado. Estás a programar o teu
      lutador e depois vê-lo executar.`,
    space: '9 artes, 4 por ordem · <b>3 024</b> sequências',
    good: 'De longe a que dá mais theorycrafting. É uma rotação, como num ARPG, mas montada fora do combate.',
    bad: 'É a que mais se aproxima de «estar a jogar». Precisa de artes que conversem entre si ou a ordem não interessa.',
    body: chain,
  },
];

const page = `<title>訣 Quatro Sistemas de Artes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.62 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:820px; margin:0 auto; padding-block:40px 80px;
           padding-left:18px; padding-right:18px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1,h2,h3 { margin:0; font-weight:600; text-wrap:balance; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(38px,11vw,54px); font-weight:400;
       color:var(--cyan); line-height:1.02; }
  h2 { font-family:Rajdhani,sans-serif; font-size:27px; }
  h3 { font-family:Rajdhani,sans-serif; font-size:17px; color:var(--faint);
       letter-spacing:.06em; text-transform:uppercase; }
  p { margin:0; }
  .sub { color:var(--faint); font-size:17px; margin-top:8px; }
  .says { color:var(--faint); max-width:56ch; font-size:15.5px; }
  .says b { color:var(--text); font-weight:600; }
  .tag { font-size:11px; letter-spacing:.22em; text-transform:uppercase;
         color:var(--cyan); font-weight:600; }
  .part { margin-top:44px; border-top:1px solid var(--line); padding-top:26px;
          display:flex; flex-direction:column; gap:14px; }

  /* as nove artes */
  .arts { display:grid; gap:8px; }
  @media(min-width:640px){ .arts { grid-template-columns:1fr 1fr; } }
  .art { display:flex; gap:11px; align-items:flex-start; background:var(--panel2);
         border:1px solid var(--line); border-left:3px solid var(--hue,var(--line));
         border-radius:10px; padding:10px 12px; }
  .art .ic { color:var(--hue); flex:none; display:grid; place-items:center; margin-top:1px; }
  .art .ic svg { display:block; }
  .art b { font-size:16px; color:var(--hue); }
  .art em { font-style:normal; font-size:13px; }
  .art i { font-style:normal; display:block; font-size:12.5px; color:var(--faint);
           line-height:1.4; margin-top:2px; }
  .art .body { flex:1; }
  .art .from { display:block; margin-top:5px; font-size:10.5px; color:var(--hue);
               opacity:.85; letter-spacing:.03em; }
  .art .from .cjk { margin-right:2px; }
  .art .when { flex:none; font-family:Rajdhani,sans-serif; font-weight:700; font-size:11px;
               color:var(--gold); align-self:center; text-align:right; max-width:72px; }
  .art.lit { background:color-mix(in srgb,var(--hue) 10%,var(--panel2)); }
  .art.empty { border-left-color:var(--line); border-style:dashed; justify-content:center;
               padding:16px; }
  .art.empty i { color:var(--faint); opacity:.6; }
  .slots { display:grid; gap:8px; }

  /* a tira de rondas */
  .strip { display:flex; gap:4px; margin-top:12px; position:relative; }
  .rd { flex:1; min-height:52px; border:1px solid var(--line); border-radius:8px;
        background:var(--panel2); display:flex; flex-direction:column; align-items:center;
        justify-content:center; gap:2px; padding:5px 2px; }
  .rd .no { font-family:Rajdhani,sans-serif; font-weight:700; font-size:10px;
            color:var(--faint); }
  .rd .fire { font-size:17px; text-shadow:0 0 12px currentColor; }
  /* Opaque, or the round numbers underneath read straight through the words. */
  .strip .band { position:absolute; inset:0; border:1px solid var(--gold); border-radius:8px;
                 background:color-mix(in srgb,var(--gold) 9%,var(--ground)); display:grid;
                 place-items:center; font-family:'Noto Serif SC',serif; font-size:14px;
                 color:var(--gold); z-index:1; }

  /* o paperdoll dos meridianos */
  .paper { display:grid; gap:6px; }
  .pslot { display:grid; grid-template-columns:1fr auto auto; gap:12px; align-items:center;
           background:var(--panel2); border:1px solid var(--line); border-radius:9px;
           padding:9px 13px; font-size:14px; }
  .pslot .ph b { font-family:'Noto Serif SC',serif; font-weight:400; margin-right:5px;
                 color:var(--cyan); }
  .pslot .holes { color:var(--gold); letter-spacing:3px; font-size:13px; }
  .pslot .pin b { font-size:16px; }
  .pslot .pin i { font-style:normal; color:var(--faint); }

  /* as posturas */
  .stances { display:grid; gap:8px; }
  @media(min-width:620px){ .stances { grid-template-columns:repeat(3,1fr); } }
  .stance { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
            padding:13px; }
  .stance.lit { border-color:var(--magenta);
                background:color-mix(in srgb,var(--magenta) 11%,var(--panel2)); }
  .stance b { font-size:28px; color:var(--cyan); display:block; line-height:1.1; }
  .stance.lit b { color:var(--magenta); }
  .stance em { font-style:normal; font-family:Rajdhani,sans-serif; font-weight:700;
               font-size:16px; }
  .stance i { font-style:normal; display:block; font-size:12.5px; color:var(--faint);
              margin-top:3px; line-height:1.4; }
  .stance .wants { display:block; margin-top:7px; font-size:11px; color:var(--gold);
                   font-family:Rajdhani,sans-serif; font-weight:600; }

  /* a sequência */
  .chain { display:grid; gap:6px; }
  .link { display:flex; gap:11px; align-items:center; background:var(--panel2);
          border:1px solid var(--line); border-radius:10px; padding:9px 12px;
          position:relative; }
  .link .n { flex:none; width:22px; height:22px; border-radius:7px; display:grid;
             place-items:center; background:var(--hue); color:#080A18;
             font-family:Rajdhani,sans-serif; font-weight:700; font-size:13px; }
  .link .ic { color:var(--hue); display:grid; place-items:center; flex:none; }
  .link .ic svg { display:block; }
  .link b { font-size:16px; color:var(--hue); margin-right:8px; }
  .link i { font-style:normal; font-size:12.5px; color:var(--faint); }
  .link .body { display:flex; align-items:baseline; flex-wrap:wrap; }

  .prop { margin-top:46px; border-top:1px solid var(--line); padding-top:26px;
          display:flex; flex-direction:column; gap:13px; }
  .title { display:flex; gap:12px; align-items:baseline; flex-wrap:wrap; }
  .title .han { font-family:'Noto Serif SC',serif; font-size:40px; color:var(--cyan);
                line-height:1; }
  .title .t { font-size:12px; color:var(--faint); letter-spacing:.06em; }
  .idea { font-size:16px; color:var(--text); }
  .verdict { display:grid; gap:7px; margin-top:4px; }
  @media(min-width:620px){ .verdict { grid-template-columns:1fr 1fr; } }
  .v { border-left:2px solid; padding-left:12px; font-size:13.5px; line-height:1.5; }
  .v.good { border-color:var(--cyan); color:var(--text); }
  .v.bad { border-color:var(--magenta); color:var(--faint); }
  .space { font-family:Rajdhani,sans-serif; font-weight:600; font-size:14px;
           color:var(--gold); }
  .space b { font-size:20px; }
  .note { border-left:2px solid var(--magenta); padding:8px 0 8px 16px; color:var(--faint);
          font-size:15px; }
  .note b { color:var(--text); font-weight:600; }
  .pick { background:linear-gradient(180deg,
            color-mix(in srgb,var(--cyan) 10%,var(--panel2)), var(--panel2));
          border:1px solid var(--cyan); border-radius:14px; padding:20px 22px;
          margin-top:44px; }
  .pick h2 { color:var(--cyan); }
</style>

<div class="sheet">
  <header>
    <h1>訣</h1>
    <p class="sub">Quatro maneiras de ter artes de combate.</p>
    <p class="says" style="margin-top:14px">O combate é o único sistema do jogo
      <b>sem decisão nenhuma</b>. Escolhes uma besta, vês, ganhas ou perdes, e tudo já
      estava decidido antes de carregares. O equipamento tem decisão. A árvore tem. Os
      sets têm. O combate não.</p>
    <p class="says" style="margin-top:10px">Nenhuma destas põe um botão <em>dentro</em> da
      luta. «Combate automático que se vê» é a premissa, e um idle que precisa de ti
      presente deixa de ser um idle. Todas decidem <b>antes</b> e depois saem da frente.</p>
  </header>

  <div class="part">
    <p class="tag">O que as quatro partilham</p>
    <h2>Cada guardiã larga a sua arte</h2>
    <p class="says">Nove artes, uma por reino, na ordem em que sobes. Não é preciso
      inventar uma fonte nova nem uma moeda nova, e a luta da guardiã deixa de ser só um
      portão. Passa a ser <b>a coisa que te muda a build</b>.</p>
    <div class="arts">${ARTS.map((a) => artCard(a, { note: a.when, from: true })).join('')}</div>
    <p class="says" style="margin-top:6px">Repara que já não puxam todas a mesma alavanca:
      três querem lutas longas, uma quer lutas curtas, uma só serve quando estás quase a
      perder. É daí que vem a diversidade, não do número de artes.</p>
  </div>

  ${PROPOSALS.map((p, i) => `<section class="prop">
    <p class="tag">Proposta ${i + 1}</p>
    <div class="title">
      <span class="han cjk">${p.han}</span>
      <h2>${p.name}</h2>
      <span class="t">${p.tag}</span>
    </div>
    <p class="idea">${p.idea}</p>
    <p class="says">${p.text}</p>
    <h3>Como se monta</h3>
    ${p.body}
    <p class="space">${p.space}</p>
    <div class="verdict">
      <p class="v good">${p.good}</p>
      <p class="v bad">${p.bad}</p>
    </div>
  </section>`).join('')}

  <div class="pick">
    <p class="tag">A minha escolha</p>
    <h2>勢 A Postura, mais 招 uma sequência curta</h2>
    <p class="says" style="margin-top:10px">Sozinhas, a 勢 tem consequência mas pouca
      escolha, e a 招 tem escolha a mais para um jogo que queres simples. Juntas
      resolvem-se uma à outra: <b>uma postura</b> que diz em que género de personagem
      andas, e <b>três artes por ordem</b> que dizem como é que essa personagem luta.
      São 9 × 9 × 8 × 7 = <b>4 536</b> combinações, e ao contrário dos números grandes
      das outras, quase todas jogam mesmo de maneira diferente.</p>
    <p class="says" style="margin-top:10px">Ficas com dois ecrãs de decisão em vez de um,
      e as duas metades conversam. O 疾 bate duas vezes por ronda, por isso quer artes que
      disparem a cada ronda. O 兇 quer acabar depressa, por isso quer o 猿臂 e o 虎嘯 cedo.
      A mesma sequência em posturas diferentes joga de maneira diferente.</p>
    <p class="note" style="margin-top:14px"><b>Se tiver de ser só uma</b>, escolhe a
      <b>勢 Postura</b>. É a que se percebe sem ler nada, a que menos código precisa, e a
      única que te deixa dizer o que és numa palavra. A sequência pode vir depois sem
      partir nada. As artes são as mesmas.</p>
    <p class="says" style="margin-top:12px">Sobre <b>consumíveis</b>, mantenho o que disse:
      não. Num idle ou tens tantos que são poder de graça, ou guardas o elixir para o
      chefe final e nunca o usas. Se um dia quiseres a versão estreita que funciona, é um
      丹 comprado com o 材 que já andas a juntar, gasto antes de uma luta que perderias.
      Uma decisão, sem inventário nenhum.</p>
  </div>
</div>`;

writeFileSync('arts.html', page);
console.log(`arts.html · ${(page.length / 1024).toFixed(0)} KB · ${ARTS.length} arts, ${PROPOSALS.length} proposals`);
