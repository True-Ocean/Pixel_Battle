import type { ReactNode } from 'react';
import { HelpInlinePxCost, HelpInlinePxIcon } from '../components/HelpInlineEconomy';
import { PIXEL_COST_RENAME } from './economy';

export type HelpItem = string | ReactNode;

export interface HelpSection {
  title: string | ReactNode;
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
        '自分がお絵描きしたイメージとカード名から、BP・属性・レア度が自動で決まります。',
        '属性は、新規作成時に、解放済み属性の中からランダムに決定されます。',
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
          'イメージ・カード名・キャンバスサイズ（拡大のみ）を変更できます。',
          'カードを編集しても、属性は変わりません。属性を変更するには、カード詳細の属性変更ボタンを使います。',
          '編集内容を保存すると、現在のレベルに応じて BP が再計算されます。',
        ],
      },
      {
        title: (
          <>
            <HelpInlinePxIcon />
            がかかる操作
          </>
        ),
        items: [
          <>
            カード名を変えて保存 … <HelpInlinePxCost amount={PIXEL_COST_RENAME} />
          </>,
          <>
            キャンバス拡大 … 拡大した分の <HelpInlinePxIcon />
            相当額
          </>,
        ],
      },
    ],
  };
}
