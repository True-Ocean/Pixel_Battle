import { DECK_MAX } from './balance';
import {
  JEWEL_COST_DELETE,
  LOST_MIN_USER_LEVEL,
  PIXEL_COST_RENAME,
  REVIVE_CAP,
} from './economy';

export interface HelpSection {
  title: string;
  items: readonly string[];
  /** このレベル以上で表示 */
  minLevel?: number;
}

export interface HelpTopic {
  title: string;
  sections: readonly HelpSection[];
}

export function getVisibleHelpSections(
  sections: readonly HelpSection[],
  userLevel: number,
): HelpSection[] {
  return sections.filter(
    (section) => section.minLevel == null || userLevel >= section.minLevel,
  );
}

export function getBattleHubHelp(userLevel: number): HelpTopic {
  const sections: HelpSection[] = [
    {
      title: 'バトルの流れ',
      items: [
        `デッキ ${DECK_MAX} 枚を選び、前衛 2・後衛 3 に配置します。`,
        '準備は 30 秒。未配置分は「ランダム配置」または時間切れで自動配置。',
        '5 枚配置後に「準備完了」でバトル開始。',
      ],
    },
    {
      title: '1 ターンの操作',
      items: [
        '行動カードを 1 枚選びます（行動ボタンはありません）。',
        '敵前衛をタップ → 近接攻撃。',
        '盾のない味方をタップ → 盾付与（盾属性など）。',
        '中央のガイダンス帯に、今やるべき操作が表示されます。',
      ],
    },
    {
      title: '前衛が空いたら',
      items: [
        '後衛から前衛へ補充します。',
        '候補が 2 枚のときは「選ぶ → もう一度タップで確定」。',
        '候補が 1 枚だけなら自動で前衛に上がります。',
      ],
    },
    {
      title: '勝敗と報酬',
      items: [
        'どちらか 5 枚すべて BP 0 で終了。',
        '勝利時は相手墓地から 1 枚選び、px と属性のかけらを獲得。',
        '属性ごとの詳しい戦い方は、各カード詳細の「詳しい説明を見る」へ。',
      ],
    },
    {
      title: `Lv.${LOST_MIN_USER_LEVEL} からの敗北ペナルティ`,
      minLevel: LOST_MIN_USER_LEVEL,
      items: [
        `Lv.${LOST_MIN_USER_LEVEL} 未満は敗北してもロストしません。`,
        `Lv.${LOST_MIN_USER_LEVEL} 以上で敗北すると、自分の墓地から 1 枚がロスト。`,
        'ロスト中はバトルに出せません。5 枚揃うまで通常 CPU 戦は開始できません。',
      ],
    },
    {
      title: 'ロスト後の選択肢',
      minLevel: LOST_MIN_USER_LEVEL,
      items: [
        `マイデッキのカード詳細から「復活」（px 消費・1 枚最大 ${REVIVE_CAP} 回）。`,
        '「思い出アルバムに保存」でデッキから外す（無償・閲覧専用）。',
        `「削除」は 💎${JEWEL_COST_DELETE} ＋ px・かけら返還。`,
      ],
    },
    {
      title: '護符',
      minLevel: LOST_MIN_USER_LEVEL,
      items: [
        'カード詳細から装備すると、次のロスト 1 回を防げます。',
        `Lv.${LOST_MIN_USER_LEVEL} 到達時やショップなどで入手できます。`,
      ],
    },
  ];

  if (userLevel < LOST_MIN_USER_LEVEL) {
    sections.push({
      title: 'あとで知っておくこと',
      items: [
        `Lv.${LOST_MIN_USER_LEVEL} から、敗北時にカードがロストするようになります。`,
        'その前に護符や復活の仕組みを、ここで再度確認できます。',
      ],
    });
  }

  return {
    title: 'バトルの進め方',
    sections: getVisibleHelpSections(sections, userLevel),
  };
}

export function getEditorHelp(isEditing: boolean): HelpTopic {
  const common: HelpSection[] = [
    {
      title: 'カードの作り方',
      items: [
        '絵と名前から、BP・属性・レア度が自動で決まります。',
        '新規作成時の属性は、解放済みの中からランダムです。',
        '1 マス以上塗る必要があります。',
      ],
    },
    {
      title: 'ツールと色',
      items: [
        '描画ツールと色はレベルで順次解放されます（🔒 は未解放）。',
        '追加色・ツールの早期解放は、パレットやツールの 🔒 から購入できます。',
      ],
    },
  ];

  if (!isEditing) {
    return {
      title: 'イメージ作成',
      sections: common,
    };
  }

  return {
    title: 'カード編集',
    sections: [
      ...common,
      {
        title: '変更できること',
        items: [
          'ドット絵・カード名・キャンバスサイズ（拡大のみ）を変更できます。',
          '属性はここでは変更できません。カード詳細のリタッチ/セレクトを使います。',
          '保存すると、現在のレベルに応じて BP が再計算されます。',
        ],
      },
      {
        title: 'px がかかる操作',
        items: [
          `名前を変えて保存 … 🪙${PIXEL_COST_RENAME.toLocaleString()}`,
          'キャンバス拡大 … 拡大した分の px（保存前に元サイズへ戻せば拡大コスト 0）',
        ],
      },
    ],
  };
}
