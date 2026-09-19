/** Números que um jogador lê de relance, não que um contador imprime. */
export function num(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const abs = Math.abs(n);
  const esc = (v: number, s: string) =>
    `${v >= 100 ? Math.round(v) : Number(v.toFixed(v >= 10 ? 1 : 2))}${s}`;
  if (abs >= 1e12) return esc(n / 1e12, 'T');
  if (abs >= 1e9) return esc(n / 1e9, 'B');
  if (abs >= 1e6) return esc(n / 1e6, 'M');
  if (abs >= 1e4) return esc(n / 1e3, 'k');
  if (abs >= 100) return Math.round(n).toString();
  return Number(n.toFixed(1)).toString();
}

export function duracao(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)} s`;
  if (segundos < 3600) return `${Math.round(segundos / 60)} min`;
  if (segundos < 86_400) {
    const h = Math.floor(segundos / 3600);
    const m = Math.round((segundos % 3600) / 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(segundos / 86_400);
  const h = Math.round((segundos % 86_400) / 3600);
  return h ? `${d} d ${h} h` : `${d} d`;
}
