export type CardBackSide = 'cpu' | 'player';

/** カード裏面（対戦準備・相手手札用） */
export function CardBack({ side }: { side?: CardBackSide }) {
  const sideClass =
    side === 'cpu'
      ? 'card-back-cpu'
      : side === 'player'
        ? 'card-back-player'
        : '';
  return (
    <div className={`card-back ${sideClass}`.trim()} aria-hidden>
      <div className="card-back-pattern" />
      <span className="card-back-mark">?</span>
    </div>
  );
}
