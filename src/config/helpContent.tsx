import type { ReactNode } from 'react';
import {
  HelpInlineJewelCost,
  HelpInlinePxCost,
  HelpInlinePxIcon,
} from '../components/HelpInlineEconomy';
import {
  JEWEL_COST_DELETE,
  JEWEL_COST_MEMORY_ALBUM_ROW,
  MEMORY_ALBUM_INITIAL_ROWS,
  MEMORY_ALBUM_SLOTS_PER_ROW,
  PIXEL_COST_RENAME,
  REVIVE_CAP,
} from './economy';
import { OFFLINE_PVP_MIN_USER_LEVEL } from '../offlinePvp/unlock';

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
    title: 'マイデッキ',
    sections: [
      {
        title: '1. カードの見方（左から）',
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
      {
        title: '2. デッキ名の変更',
        items: [
          'デッキタブを長押し、または選択中にダブルタップで名前を変更できます。',
          'デッキ名の変更はサブスク会員限定の特典です。',
        ],
      },
      {
        title: '3. 対人戦へのデッキ公開',
        items: [
          `ユーザーレベル ${OFFLINE_PVP_MIN_USER_LEVEL} 到達後、「対人戦に公開する」にチェックを入れると、対人戦で他のユーザーにデッキが公開されます。`,
        ],
      },
      {
        title: '4. 並べ替え',
        items: [
          '画面下の「並べ替え」を押すと、カードの順序を変更できます。',
          'ドラッグで同じデッキ内の並び順を変えられます。',
          '他のデッキタブへドロップするとカードを移動できます。タブ上でドロップすると空きスロットへ自動配置され、満杯のときはキャンセルされます。カード同士のスロットにドロップすると入れ替えます。',
          '終わったら「完了」を押します。',
        ],
      },
    ],
  };
}

export function getMemoryAlbumHelp(): HelpTopic {
  const initialSlots = MEMORY_ALBUM_INITIAL_ROWS * MEMORY_ALBUM_SLOTS_PER_ROW;
  return {
    title: '思い出アルバム',
    sections: [
      {
        title: '1. 思い出アルバムとは',
        items: [
          'デッキから外したカードを、閲覧専用で保管する場所です。',
          'ここに保存したカードは、マイデッキには戻せません。',
        ],
      },
      {
        title: '2. カードの保存',
        items: [
          'マイデッキのカード詳細から「思い出アルバムに保存」で保存できます（無料）。',
        ],
      },
      {
        title: '3. カードの閲覧',
        items: [
          'サムネイルをタップすると、カードの詳細を閲覧できます。',
        ],
      },
      {
        title: '4. アルバム拡張',
        items: [
          `最初は ${initialSlots} 枚分の空きがあります。`,
          <>
            アルバムを拡張すると、さらに {MEMORY_ALBUM_SLOTS_PER_ROW}{' '}
            枚分の枠が追加されます（
            <HelpInlineJewelCost amount={JEWEL_COST_MEMORY_ALBUM_ROW} />
            ）。
          </>,
        ],
      },
      {
        title: '5. アルバムからの削除',
        items: [
          <>
            カード詳細の「思い出アルバムから削除」で完全に削除できます（
            <HelpInlineJewelCost amount={JEWEL_COST_DELETE} />
            ）。
          </>,
          '一度削除したカードは元に戻せません。',
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
            （プレミアム会員は無料）
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
