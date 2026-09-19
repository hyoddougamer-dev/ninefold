import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BESTAS, type Besta } from '../data/bestiario.ts';
import { reino as reinoDe } from '../data/reinos.ts';
import { espolio, guardiaAtual, lutar, poderBesta, type Resultado } from '../sim/combate.ts';
import { novo, poder, type Estado } from '../sim/estado.ts';
import { duracao, num } from '../sim/formato.ts';
import { carregar, gravar } from '../sim/save.ts';
import { avancar } from '../sim/tempo.ts';
import { retrato, selo } from '../art/aura.ts';
import { Bestiario } from './telas/Bestiario.tsx';
import { Caca } from './telas/Caca.tsx';
import { Cultivo } from './telas/Cultivo.tsx';
import { Svg } from './ui/Svg.tsx';

const ABAS = [
  { chave: 'cultivo', han: '修', rotulo: 'Cultivo' },
  { chave: 'caca', han: '狩', rotulo: 'Caça' },
  { chave: 'bestiario', han: '錄', rotulo: 'Bestiário' },
] as const;

type Aba = (typeof ABAS)[number]['chave'];

const agora = () => Date.now() / 1000;

interface Luta {
  readonly besta: Besta;
  readonly resultado: Resultado;
  readonly rodada: number;
  readonly acabou: boolean;
}

interface Retorno {
  readonly segundos: number;
  readonly qi: number;
  readonly camadas: number;
  readonly reinos: number;
}

export function App() {
  const [aba, setAba] = useState<Aba>('cultivo');
  const [estado, setEstado] = useState<Estado>(() => novo(agora()));
  const [luta, setLuta] = useState<Luta | null>(null);
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  const [pulso, setPulso] = useState(0);
  const [pronto, setPronto] = useState(false);
  const carregado = useRef(false);

  // 歸 A volta. Um idle é jogado fechado, então abrir o app é antes de tudo receber as
  // horas que passaram — e o jogador quer ver quanto rendeu antes de qualquer outra coisa.
  useEffect(() => {
    if (carregado.current) return;
    carregado.current = true;
    const v = carregar(agora());
    setEstado(v.estado);
    setPronto(true);
    if (v.segundosFora > 120) {
      setRetorno({
        segundos: v.segundosFora, qi: v.qiGanho,
        camadas: v.camadasAbertas, reinos: v.reinosSubidos,
      });
    }
  }, []);

  // O relógio. O tempo anda por carimbo, nunca por quadro: este intervalo só pergunta
  // que horas são, e `avancar` faz o resto — então perder quadros não perde progresso.
  useEffect(() => {
    if (!pronto) return;
    const id = setInterval(() => {
      setEstado((e) => avancar(e, agora()));
      setPulso((p) => (p + 0.02) % 1);
    }, 200);
    return () => clearInterval(id);
  }, [pronto]);

  /**
   * Gravar, mas nunca antes de carregar.
   *
   * `pronto` não é zelo: sem ele este efeito roda uma vez com o estado inicial vazio e
   * a limpeza dele grava esse vazio por cima do save carregado, apagando a partida de
   * quem abriu o app. Aconteceu, e foi assim que apareceu.
   */
  useEffect(() => {
    if (!pronto) return;
    const id = setInterval(() => gravar(estado), 4000);
    const aoSair = () => gravar(estado);
    document.addEventListener('visibilitychange', aoSair);
    window.addEventListener('pagehide', aoSair);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', aoSair);
      window.removeEventListener('pagehide', aoSair);
      gravar(estado);
    };
  }, [estado, pronto]);

  const iniciarLuta = useCallback((besta: Besta) => {
    setLuta((atual) => {
      if (atual) return atual;   // uma luta de cada vez
      return {
        besta,
        resultado: lutar(estado, besta, Math.floor(agora() * 1000) >>> 0),
        rodada: 0,
        acabou: false,
      };
    });
  }, [estado]);

  // As rodadas já estão todas calculadas; isto só as desenha, uma a uma.
  useEffect(() => {
    if (!luta || luta.acabou) return;
    const id = setTimeout(() => {
      setLuta((l) => {
        if (!l) return l;
        const proxima = l.rodada + 1;
        return proxima >= l.resultado.rodadas.length
          ? { ...l, rodada: l.resultado.rodadas.length - 1, acabou: true }
          : { ...l, rodada: proxima };
      });
    }, 260);
    return () => clearTimeout(id);
  }, [luta]);

  const fecharLuta = useCallback(() => {
    if (!luta) return;
    const { besta, resultado } = luta;
    if (resultado.venceu) {
      setEstado((e) => ({
        ...e,
        guardiaCaiu: besta.guardia ? true : e.guardiaCaiu,
        materiais: e.materiais + (besta.guardia ? espolio(besta) * 4 : espolio(besta)),
        abatidas: { ...e.abatidas, [besta.chave]: (e.abatidas[besta.chave] ?? 0) + 1 },
      }));
    }
    setLuta(null);
  }, [luta]);

  const r = reinoDe(estado.reino);
  const rodada = luta?.resultado.rodadas[luta.rodada];
  const porChave = useMemo(
    () => Object.fromEntries(BESTAS.map((b) => [b.chave, b])) as Record<string, Besta>,
    [],
  );

  return (
    <div className="app">
      <div className="folha" key={aba}>
        {aba === 'cultivo' && (
          <Cultivo
            estado={estado}
            pulso={pulso}
            defina={setEstado}
            lutar={() => iniciarLuta(guardiaAtual(estado))}
          />
        )}
        {aba === 'caca' && (
          <Caca estado={estado} lutarCom={(chave) => iniciarLuta(porChave[chave])} />
        )}
        {aba === 'bestiario' && <Bestiario estado={estado} />}
      </div>

      <nav className="abas">
        {ABAS.map((a) => (
          <button key={a.chave} data-on={aba === a.chave} onClick={() => setAba(a.chave)}>
            <span className="g cjk">{a.han}</span>
            <span className="l">{a.rotulo}</span>
          </button>
        ))}
      </nav>

      {luta && rodada && (
        <div className="arena">
          <div className="lado">
            <div className="figura">
              <Svg html={retrato({ reino: estado.reino, pulso, foco: true })} />
            </div>
            <div className="linha" style={{ fontSize: 12.5 }}>
              <span className="cjk" style={{ color: r.cor }}>{r.han}</span>
              <span className="mono fraco">力 {num(luta.resultado.poderJogador)}</span>
            </div>
            <div className="vida">
              <i style={{ width: `${rodada.vidaJogador * 100}%`, background: 'var(--ciano)' }} />
            </div>
          </div>

          <div className="versus">
            {luta.acabou ? '' : `rodada ${luta.rodada + 1}`}
          </div>

          <div className="lado">
            <div className="figura">
              <span><Svg html={selo(luta.besta.icone, reinoDe(luta.besta.reino).cor, !!luta.besta.guardia)} /></span>
            </div>
            <div className="linha" style={{ fontSize: 12.5 }}>
              <span className="cjk" style={{ color: reinoDe(luta.besta.reino).cor }}>{luta.besta.han}</span>
              <span className="mono fraco">力 {num(poderBesta(luta.besta))}</span>
            </div>
            <div className="vida">
              <i style={{ width: `${rodada.vidaBesta * 100}%`, background: 'var(--magenta)' }} />
            </div>
          </div>

          {luta.acabou && (
            <div className="desfecho">
              <span className="han" style={{ color: luta.resultado.venceu ? 'var(--ciano)' : 'var(--magenta)' }}>
                {luta.resultado.venceu ? '勝' : '敗'}
              </span>
              <p>
                {luta.resultado.venceu
                  ? luta.besta.guardia
                    ? 'A guardiã caiu. O rompimento está aberto.'
                    : `+${num(espolio(luta.besta))} de material.`
                  : 'Nada se perdeu. Volte com mais poder.'}
              </p>
              <button className="acao" style={{ marginTop: 16 }} onClick={fecharLuta}>
                {luta.resultado.venceu ? '收' : '退'}{' '}
                <span>{luta.resultado.venceu ? 'Recolher' : 'Recuar'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {retorno && (
        <div className="volta">
          <Svg html={retrato({ reino: estado.reino, pulso })} style={{ display: 'block', width: 150, height: 150 }} />
          <h2 style={{ color: r.cor }}>歸</h2>
          <p className="fraco" style={{ margin: 0, fontSize: 14 }}>
            Você esteve fora {duracao(retorno.segundos)}.
          </p>
          <dl>
            <dt>qi juntado</dt>
            <dd style={{ color: r.cor }}>{num(retorno.qi)}</dd>
            {retorno.camadas > 0 && (<><dt>camadas abertas</dt><dd>{retorno.camadas}</dd></>)}
            {retorno.reinos > 0 && (<><dt>reinos subidos</dt><dd style={{ color: 'var(--magenta)' }}>{retorno.reinos}</dd></>)}
            <dt>poder agora</dt>
            <dd>{num(poder(estado))}</dd>
          </dl>
          <button className="acao" style={{ maxWidth: 240 }} onClick={() => setRetorno(null)}>
            續 <span>Continuar</span>
          </button>
        </div>
      )}
    </div>
  );
}
