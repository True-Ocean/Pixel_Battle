import type { ReactNode } from 'react';
import { PIXEL_COST_RENAME } from './economy';

export type HelpItem = string | ReactNode;

export interface HelpSection {
  title: string;
  items: readonly HelpItem[];
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

export { getBattleHubHelp } from './battleHubHelp';

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
