/**
 * 引 How to play, in four steps.
 *
 * It exists because Bruno said long explanations do not land — so every step is one
 * bold line and one thin line under it, and nothing on this screen explains a mechanic
 * that the player is not about to touch.
 */
export function Help({ onClose }: { onClose: () => void }) {
  const steps = [
    ['The qi rises on its own', 'Even with the phone closed. Come back tomorrow and it is all there.'],
    ['Spend it on the four boxes', 'Each one makes you rise faster. Nothing is ever lost.'],
    ['When the bar fills, a beast appears', 'Tap 戰 Fight. It resolves on its own. Losing costs nothing.'],
    ['Then 突破 Break through', 'You climb a realm, and the light around you changes.'],
  ];

  return (
    <div className="help">
      <h2>引 How to play</h2>
      <ol>
        {steps.map(([title, line], i) => (
          <li key={title}>
            <span>{i + 1}</span>
            <span><b>{title}</b><i>{line}</i></span>
          </li>
        ))}
      </ol>
      <p className="faint" style={{ fontSize: 13.5, margin: 0 }}>
        The 狩 Hunt tab has beasts to kill for material. Material buys 妖丹 cores.
      </p>
      <p className="faint" style={{ fontSize: 13.5, margin: 0 }}>
        It is slow at the start — realm 1 gathers 1 qi a second. Buy 丹藥 pills and
        功法 method as soon as you can afford them.
      </p>
      <button className="act" style={{ marginTop: 'auto' }} onClick={onClose}>
        始 <span>Begin</span>
      </button>
    </div>
  );
}
