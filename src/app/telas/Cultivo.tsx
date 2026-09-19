import { LAYERS_PER_REALM } from '../../sim/balance.ts';
import { guardiaAtual, chance } from '../../sim/combate.ts';
import {
  MELHORIAS, MELHORIA_INFO, comprar, custoMelhoria, noTeto, podeComprar, podeRomper,
  poder, romper, type Estado,
} from '../../sim/estado.ts';
import { num } from '../../sim/formato.ts';
import { progresso, taxa } from '../../sim/tempo.ts';
import { reino as reinoDe } from '../../data/reinos.ts';
import { retrato, selo } from '../../art/aura.ts';
import { icone } from '../../art/icone.ts';
import { Svg } from '../ui/Svg.tsx';

export function Cultivo({ estado, pulso, defina, lutar }: {
  estado: Estado;
  pulso: number;
  defina: (e: Estado) => void;
  lutar: () => void;
}) {
  const r = reinoDe(estado.reino);
  const cheio = noTeto(estado);
  const g = guardiaAtual(estado);
  const pronto = podeRomper(estado);
  const dia = Math.floor((estado.em - estado.iniciado) / 86_400) + 1;

  return (
    <>
      <div className="linha">
        <span className="fraco" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          修 Cultivo · dia {dia}
        </span>
        <span className="fraco mono" style={{ fontSize: 12 }}>
          力 {num(poder(estado))}
        </span>
      </div>

      <div className="linha" style={{ alignItems: 'baseline', marginTop: 4 }}>
        <h1 className="cjk" style={{ margin: 0, fontSize: 30, fontWeight: 400, color: r.cor }}>{r.han}</h1>
        <span className="fraco mono" style={{ fontSize: 13 }}>
          camada {Math.min(estado.camada + 1, LAYERS_PER_REALM)} / {LAYERS_PER_REALM}
        </span>
      </div>
      <p className="fraco" style={{ margin: '1px 0 8px', fontSize: 13 }}>{r.nome}</p>

      <div className="retrato">
        <Svg html={retrato({ reino: estado.reino, pulso })} />
      </div>

      <div className="qi">
        <div className="n mono" style={{ color: r.cor }}>{num(estado.qi)}</div>
        <div className="r mono">+{num(taxa(estado))} qi / s</div>
      </div>

      <div className="barra" style={{ margin: '14px 0 6px' }}>
        <i style={{ width: `${progresso(estado) * 100}%`, background: r.cor }} />
      </div>
      <div className="linha" style={{ fontSize: 12 }}>
        <span className="fraco">{r.ganha}</span>
        <span className="mono" style={{ color: 'var(--ouro)' }}>材 {num(estado.materiais)}</span>
      </div>

      {cheio && !estado.guardiaCaiu && (
        <>
          <h2 className="titulo">妖 A guardiã do reino</h2>
          <div className="cartao">
            <div className="linha">
              <span className="selo" style={{ width: 52, height: 52, flex: 'none' }}>
                <Svg html={selo(g.icone, r.cor, true)} />
              </span>
              <span style={{ flex: 1 }}>
                <b className="cjk" style={{ fontSize: 17, color: r.cor, display: 'block' }}>{g.han}</b>
                <i className="fraco" style={{ fontStyle: 'normal', fontSize: 12 }}>{g.nome}</i>
              </span>
              <span className="tec mono" style={{ fontSize: 17, textAlign: 'right' }}>
                {Math.round(chance(estado, g) * 100)}%
                <em className="fraco" style={{ display: 'block', fontStyle: 'normal', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'Archivo' }}>chance</em>
              </span>
            </div>
            <p className="fraco" style={{ margin: '11px 0 12px', fontSize: 12.5 }}>
              Ela barra o rompimento. Perder não custa nada — você volta quando tiver mais poder.
            </p>
            <button className="acao" data-tom="magenta" onClick={lutar}>
              戰 <span>Enfrentar</span>
            </button>
          </div>
        </>
      )}

      {pronto && (
        <div style={{ marginTop: 16 }}>
          <button className="acao" onClick={() => defina(romper(estado))}>
            突破 <span>Romper</span>
          </button>
        </div>
      )}

      {estado.reino === 9 && (
        <div className="cartao" style={{ marginTop: 16, borderColor: r.cor }}>
          <b className="cjk" style={{ color: r.cor }}>渡劫</b>
          <p className="fraco" style={{ margin: '4px 0 0', fontSize: 13 }}>
            O nono reino é o teto desta versão. O qi continua subindo, e o que vem depois
            ainda não foi desenhado.
          </p>
        </div>
      )}

      <h2 className="titulo">Onde o qi é gasto</h2>
      <div className="melhorias">
        {MELHORIAS.map((m) => {
          const i = MELHORIA_INFO[m];
          const custo = custoMelhoria(estado, m);
          const pode = podeComprar(estado, m);
          return (
            <button key={m} className="mel" disabled={!pode} onClick={() => defina(comprar(estado, m))}>
              <span className="ic"><Svg html={icone(i.icone, 22)} /></span>
              <span>
                <b>{i.han} <span className="mono fraco" style={{ fontSize: 11 }}>{estado.niveis[m]}</span></b>
                <i>{i.efeito}</i>
              </span>
              <span className="preco">
                <b>{num(custo)}</b>
                <i className="fraco" style={{ fontStyle: 'normal', fontSize: 10, display: 'block' }}>
                  {i.moeda === 'qi' ? 'qi' : '材'}
                </i>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
