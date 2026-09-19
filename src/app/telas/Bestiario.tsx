import { BESTAS } from '../../data/bestiario.ts';
import { REINOS, reino as reinoDe } from '../../data/reinos.ts';
import type { Estado } from '../../sim/estado.ts';
import { selo } from '../../art/aura.ts';
import { AUTORES } from '../../art/icones.gerados.ts';
import { Svg } from '../ui/Svg.tsx';

/**
 * 錄 O bestiário.
 *
 * Trinta e seis fichas que se preenchem. É a tela de coleção e, de quebra, a resposta
 * mais barata que existe para "o que há de novo esta semana": um selo que acende não
 * custa conteúdo novo para produzir.
 */
export function Bestiario({ estado }: { estado: Estado }) {
  const vistas = BESTAS.filter((b) => (estado.abatidas[b.chave] ?? 0) > 0).length;

  return (
    <>
      <div className="linha">
        <span className="fraco" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          錄 Bestiário
        </span>
        <span className="mono" style={{ fontSize: 13 }}>
          <span style={{ color: 'var(--ciano)' }}>{vistas}</span>
          <span className="fraco"> / {BESTAS.length}</span>
        </span>
      </div>

      {REINOS.map((r) => {
        const doReino = BESTAS.filter((b) => b.reino === r.n);
        const alcancado = estado.reino >= r.n;
        return (
          <div key={r.n}>
            <h2 className="titulo" style={{ color: alcancado ? r.cor : undefined, opacity: alcancado ? 1 : 0.5 }}>
              <span className="cjk" style={{ fontSize: 14 }}>{r.han}</span>
              <span style={{ marginLeft: 8 }}>{r.nome}</span>
            </h2>
            <div className="grade">
              {doReino.map((b) => {
                const visto = (estado.abatidas[b.chave] ?? 0) > 0;
                return (
                  <div key={b.chave} className="ficha" data-visto={visto}>
                    <span className="selo"><Svg html={selo(b.icone, reinoDe(b.reino).cor, !!b.guardia)} /></span>
                    <b style={{ color: visto ? r.cor : 'var(--fraco)' }}>{visto ? b.han : '？'}</b>
                    <i>{visto ? `${estado.abatidas[b.chave]} abates` : b.guardia ? 'guardiã' : '—'}</i>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <h2 className="titulo">Créditos da arte</h2>
      <p className="fraco" style={{ fontSize: 12.5, margin: 0 }}>
        Ícones de game-icons.net, licença Creative Commons BY 3.0. Autores:{' '}
        {AUTORES.join(', ')}.
      </p>
    </>
  );
}
