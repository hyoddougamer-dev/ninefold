/**
 * 相 Who the cultivator is.
 *
 * 擇 Bruno, on the first 修 sheet: *"não acho certo o cultivador ficar velho apenas
 * porque sim e ser apenas male, tem que existir alguma lógica ou escolha."* Both halves
 * of that are right, and the second one is this file.
 *
 * The game never picks for the player. A save that has not been asked yet carries null,
 * and until it is answered the screen draws 影 the figure it has always drawn, which is
 * a shape and nobody in particular. Nothing about the numbers reads this: it is a
 * painting and a name, and that is all it will ever be.
 */
export interface Figure {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  /** What the picker says under the name, in the player's own language. */
  readonly says: string;
}

export const FIGURES: readonly Figure[] = [
  { key: 'woman', han: '女修', name: 'A woman', says: 'Her face on every screen from here to the ninth realm.' },
  { key: 'man', han: '男修', name: 'A man', says: 'His face on every screen from here to the ninth realm.' },
];

export const figureOf = (key: string | null): Figure | null =>
  FIGURES.find((f) => f.key === key) ?? null;

/** The key a painting is filed under: one per figure per realm. */
export const figureKey = (who: string, realm: number) => `${who}-${realm}`;

/**
 * 問 The key that remembers the *asking*, not the answer.
 *
 * It lives in `seen` beside every other once-only card. The answer cannot carry this
 * itself: validate() throws away anything that is not one of the two figures, so a save
 * that was asked and said no would come back looking unasked and be asked again on every
 * load.
 */
export const WHOM = 'whom';
