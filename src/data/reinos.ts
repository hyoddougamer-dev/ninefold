/**
 * 九境 Os nove reinos.
 *
 * Os nomes são os canônicos do gênero. O que cada reino acrescenta é a *aura* — e a
 * regra é que um reino tenha de ser legível só por ela, sem ler uma palavra.
 */
export interface Reino {
  readonly n: number;
  readonly han: string;
  readonly nome: string;
  /** A cor do reino. Caminha do ciano ao magenta conforme sobe. */
  readonly cor: string;
  /** Ícones de aura empilhados atrás da figura, do mais externo ao mais interno. */
  readonly aura: readonly string[];
  /** Anéis desenhados atrás da cabeça. Um halo lê melhor desenhado que como ícone. */
  readonly halos: number;
  readonly ganha: string;
}

export const REINOS: readonly Reino[] = [
  { n: 1, han: '練氣', nome: 'Refino de Qi',    cor: '#5FDCFF', aura: [], halos: 0,
    ganha: 'nada ainda — só a respiração' },
  { n: 2, han: '築基', nome: 'Fundação',        cor: '#5FC4FF', aura: ['aura'], halos: 0,
    ganha: 'o primeiro brilho, fraco e constante' },
  { n: 3, han: '金丹', nome: 'Núcleo Dourado',  cor: '#77AEFF', aura: ['aura'], halos: 1,
    ganha: '圓光 o halo — o primeiro sinal que se lê de longe' },
  { n: 4, han: '元嬰', nome: 'Alma Nascente',   cor: '#9B9BFF', aura: ['aura', 'sparkles'], halos: 1,
    ganha: '塵 motes de qi soltos no ar' },
  { n: 5, han: '化神', nome: 'Transformação',   cor: '#B587FF', aura: ['rear-aura', 'sparkles'], halos: 1,
    ganha: 'a aura ganha corpo atrás do cultivador' },
  { n: 6, han: '煉虛', nome: 'Refino do Vazio', cor: '#CC79FF', aura: ['beams-aura', 'rear-aura', 'sparkles'], halos: 1,
    ganha: '芒 feixes irradiando do assento' },
  { n: 7, han: '合體', nome: 'Unidade',         cor: '#E571F0', aura: ['beams-aura', 'icicles-aura', 'sparkles'], halos: 2,
    ganha: 'segundo halo e lâminas de qi em volta' },
  { n: 8, han: '大乘', nome: 'Grande Veículo',  cor: '#FF63CE', aura: ['rolling-energy', 'beams-aura', 'rear-aura', 'sparkles'], halos: 2,
    ganha: 'a energia começa a girar sozinha' },
  { n: 9, han: '渡劫', nome: 'Tribulação',      cor: '#FF5AA6', aura: ['lightning-helix', 'rolling-energy', 'beams-aura', 'sparkles'], halos: 3,
    ganha: '九雷 os nove raios, e o teto do jogo' },
];

export function reino(n: number): Reino {
  return REINOS[Math.max(0, Math.min(REINOS.length - 1, n - 1))];
}
