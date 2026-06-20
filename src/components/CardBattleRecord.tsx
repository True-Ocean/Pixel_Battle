import { REVIVE_CAP } from '../config/economy';

interface CardBattleRecordProps {
  wins: number;
  losses: number;
  reviveCount: number;
  className?: string;
}

/** カードのバトル戦績（生存 / 墓地 / 復活） */
export function CardBattleRecord({
  wins,
  losses,
  reviveCount,
  className,
}: CardBattleRecordProps) {
  const classes = ['card-battle-record', className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      <span>生存{wins}</span>
      <span>墓地{losses}</span>
      <span>
        復活 {reviveCount}/{REVIVE_CAP}
      </span>
    </span>
  );
}
