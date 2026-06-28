import { BATTLE_HISTORY_MAX } from '../battleHistory';
import type { HelpTopic } from './helpContent';

export function getBattleHistoryHelp(): HelpTopic {
  return {
    title: 'バトル履歴',
    sections: [
      {
        title: '一覧について',
        items: [
          `直近 ${BATTLE_HISTORY_MAX} 件の対戦履歴を確認できます。${BATTLE_HISTORY_MAX + 1} 件目以降は、古いものから順に消えます。`,
          'バトル履歴から再戦した結果は、バトル履歴に追加されません。',
        ],
      },
      {
        title: '対戦詳細',
        items: [
          'バトル履歴のいずれかをタップすると対戦詳細が開きます。',
          '対戦日時・勝敗・自軍／相手の戦力、相手デッキ 5 枚を確認できます。',
          '相手カードをタップするとカード詳細（属性・BP など）を閲覧できます。',
          'カード詳細に表示される相手カードの BP は、対戦当時の値となります。',
        ],
      },
    ],
  };
}
