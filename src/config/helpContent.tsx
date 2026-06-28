import type { ReactNode } from 'react';
import { HelpInlinePxCost, HelpInlinePxIcon } from '../components/HelpInlineEconomy';
import { PIXEL_COST_RENAME, REVIVE_CAP } from './economy';

export type HelpItem = string | ReactNode;

export interface HelpSection {
  title?: string | ReactNode;
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
export { getBattleHistoryHelp } from './battleHistoryHelp';

function HelpDefinedItem({
  label,
  lines,
}: {
  label: string;
  lines: readonly string[];
}) {
  return (
    <div className="help-panel-defined-item">
      <strong className="help-panel-defined-item-label">{label}</strong>
      <div className="help-panel-defined-item-desc">
        {lines.map((line) => (
          <p key={line} className="help-panel-defined-item-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function getDeckHelp(): HelpTopic {
  return {
    title: 'カードの見方（左から）',
    sections: [
      {
        items: [
          <HelpDefinedItem
            label="レア度"
            lines={['N：ノーマル、R：レア、SR：スーパーレア']}
          />,
          <HelpDefinedItem
            label="イメージアイコン"
            lines={['ユーザーがお絵描きして作成したイメージ']}
          />,
          <HelpDefinedItem
            label="カード名"
            lines={['ユーザーが名付けたカード名']}
          />,
          <HelpDefinedItem
            label="BP"
            lines={['バトルポイント、カードの強さを表します']}
          />,
          <HelpDefinedItem
            label="属性"
            lines={['カードには様々な属性があり、それぞれに異なる能力があります']}
          />,
          <HelpDefinedItem
            label="バトル実績"
            lines={[
              '生存：最後まで倒されずに生存していた回数',
              '墓地：途中で倒された回数',
              `復活：ロスト後に復活した回数（最大${REVIVE_CAP}回）`,
            ]}
          />,
          <HelpDefinedItem label="限界突破" lines={['★の数で表します']} />,
        ],
      },
    ],
  };
}

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
