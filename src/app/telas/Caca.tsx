import { cacaveis } from '../../data/bestiario.ts';
import { reino as reinoDe } from '../../data/reinos.ts';
import { chance, espolio, poderBesta } from '../../sim/combate.ts';
import { poder, type Estado } from '../../sim/estado.ts';
import { num } from '../../sim/formato.ts';
import { selo } from '../../art/aura.ts';
import { Svg } from '../ui/Svg.tsx';

/**
 * 狩 Caça livre.
 *
 * Bestas comuns, caçadas por material — é o que dá o que fazer quando o app abre, e uma
 * subida de três meses precisa disso. Não há custo em entrar e não há punição em perder;
 * o que a caça compra é 材 material, e material só compra 妖丹 núcleos.
 */
export function Caca({ estado, lutarCom }: {
  estado: Estado;
  lutarCom: (chave: string) => void;
}) {
  const lista = [...cacaveis(estado.reino)].reverse();

  return (
    <>
      <div className="linha">
        <span className="fraco" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          狩 Caça
        </span>
        <span className="mono" style={{ fontSize: 13, color: 'var(--ouro)' }}>材 {num(estado.materiais)}</span>
      </div>
      <p className="fraco" style={{ margin: '6px 0 4px', fontSize: 13 }}>
        力 {num(poder(estado))} de poder. Perder não custa nada — só o tempo da luta.
      </p>

      <h2 className="titulo">{lista.length} bestas ao seu alcance</h2>
      <div className="pilha">
        {lista.map((b) => {
          const r = reinoDe(b.reino);
          const c = chance(estado, b);
          const cor = c > 0.66 ? 'var(--ciano)' : c > 0.33 ? 'var(--ouro)' : 'var(--magenta)';
          const abates = estado.abatidas[b.chave] ?? 0;
          return (
            <button key={b.chave} className="besta" onClick={() => lutarCom(b.chave)}>
              <span className="selo"><Svg html={selo(b.icone, r.cor)} /></span>
              <span className="nome">
                <b style={{ color: r.cor }}>{b.han}</b>
                <i>
                  {b.nome} · 力 {num(poderBesta(b))} · 材 {espolio(b)}
                  {abates > 0 && <> · <span className="mono">{abates} abates</span></>}
                </i>
              </span>
              <span className="chance" style={{ color: cor }}>
                {Math.round(c * 100)}%
                <em>chance</em>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
