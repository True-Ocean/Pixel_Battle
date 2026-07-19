import { DECK_MAX } from './balance';
import { LOST_MIN_USER_LEVEL } from './economy';
import type { HelpTopic } from './helpContent';
import { HelpInlinePxIcon } from '../components/HelpInlineEconomy';
import {
  ONLINE_PVP_MIN_WALLET_PX,
  ONLINE_PVP_PX_PER_SURVIVOR,
} from '../onlinePvp/constants';

export function getCpuBattleModeHelp(): HelpTopic {
  return {
    title: 'CPU戦について',
    sections: [
      {
        items: [
          'CPU とマッチングして対戦します。',
          <>
            勝利時は、倒した相手カード（相手墓地）の中から 1 枚選び、
            <HelpInlinePxIcon />
            と属性のかけらを獲得します。
          </>,
          `Lv.${LOST_MIN_USER_LEVEL} 未満は敗北してもカードをロストしません。`,
          `Lv.${LOST_MIN_USER_LEVEL} 以上で敗北すると、そのバトルで倒された自分のカードの中から 1 枚がロスト対象として抽選されます。`,
          `ロスト中のカードはバトルに出せません。デッキに ${DECK_MAX} 枚のカードが揃うまでバトルは開始できません。`,
        ],
      },
    ],
  };
}

export function getOfflinePvpModeHelp(): HelpTopic {
  return {
    title: '公開デッキ戦について',
    sections: [
      {
        items: [
          '公開デッキ一覧から相手を選びます。相手の絵・属性はそのまま、BP だけあなたのデッキ戦力に合わせて調整されます。',
          '勝敗の報酬・ロストのルールは、CPU戦と同じです。',
          '自分のデッキは、マイデッキ画面の「公開デッキに登録する」から登録できます。',
        ],
      },
    ],
  };
}

export function getOnlinePvpModeHelp(): HelpTopic {
  return {
    title: 'フレンド対戦（オンライン）について',
    sections: [
      {
        items: [
          'ルームコードで友だちとリアルタイムバトルができます。同一ルームで連続再戦もできます。',
          <>
            参加・再戦には、手持ち
            <HelpInlinePxIcon />
            {ONLINE_PVP_MIN_WALLET_PX}以上が必要です。
          </>,
          '負けてもカードはロストしません。',
          <>
            勝者は、バトル終了後に生存していたカードの枚数 ×{' '}
            <HelpInlinePxIcon />
            {ONLINE_PVP_PX_PER_SURVIVOR}を敗者から獲得します。
          </>,
          <>
            手持ちが
            <HelpInlinePxIcon />
            {ONLINE_PVP_MIN_WALLET_PX}を下回ると、ルームから退出することになります。
          </>,
        ],
      },
    ],
  };
}
