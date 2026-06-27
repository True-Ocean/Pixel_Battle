import { DECK_MAX } from './balance';
import {
  JEWEL_COST_DELETE,
  LOST_MIN_USER_LEVEL,
  REVIVE_CAP,
} from './economy';
import type { HelpTopic } from './helpContent';
import { getVisibleHelpSections } from './helpContent';
import { HelpInlineJewelCost, HelpInlinePxIcon } from '../components/HelpInlineEconomy';

export function getBattleHubHelp(userLevel: number): HelpTopic {
  const sections: HelpTopic['sections'][number][] = [
    {
      title: 'バトルの流れ（CPU戦）',
      items: [
        `デッキ選択画面で、カード ${DECK_MAX} 枚が揃ったデッキを選びます。`,
        `デッキスロットが複数ある場合は、カードを入れ替えてバトル可能なデッキを構築できます（${DECK_MAX} 枚すべてがロスト中でないこと）。`,
        '「バトル開始」を押すと CPU とマッチングされ、相手デッキを確認したあと準備画面へ進みます。',
        '準備画面では、5 枚が前衛 2・後衛 3 にランダム配置された状態で始まります。タップで入れ替えできます。',
        '「準備完了」でバトル開始。30 秒経過で、その時点の配置のまま開始します。',
      ],
    },
    {
      title: '1 ターンの操作',
      items: [
        '自分のカードの中から、今ターンに行動するカードを 1 枚選びます（行動ボタンはありません）。',
        '属性と配置位置によって、行動できる内容が変わります。',
        '例）剣属性：後衛では行動不可／前衛では近接攻撃',
        '例）盾属性：後衛では盾付与のみ／前衛では盾付与または近接攻撃',
        '必要に応じて、敵前衛や盾のない味方をタップして攻撃先・盾先を選びます。',
        '中央のガイダンスエリアに、今やるべき操作が表示されます。',
        '選んだ行動は順番に処理され、ダメージや回復などが反映されます。',
      ],
    },
    {
      title: '近接攻撃の共通ルール',
      items: [
        '前衛にいるとき、敵前衛のどちらかに対して近接攻撃でき、自分の BP 相当のダメージを与えます。',
        '相打ちだった場合：相手の BP 相当の反撃を受けます。',
        '一方的に攻撃した場合：相手の BP の 50% 相当の反撃を受けます。',
        '近接攻撃は、BP が大きい順に処理され、BP が同じ場合は \n属性＞レア度＞限界突破＞ランダム\nの順に処理されます。',
        '弓・癒・嵐など、近接攻撃以外の行動がある属性もあります。詳しくは各カード詳細の「詳しい説明を見る」へ。',
      ],
    },
    {
      title: '前衛が空いたら',
      items: [
        '各ターンの行動判定のあと、後衛にいるカードが前衛へ移動します。',
        '前衛に上がれるカードが 2 枚あるとき：後衛カードをタップ → 空いた前衛スロットをタップで確定。',
        '候補が 1 枚だけなら自動で前衛に上がります。',
      ],
    },
    {
      title: '勝敗と報酬',
      items: [
        'どちらか一方の 5 枚すべての BP が 0 になったらバトル終了。',
        <>
          勝利時は、倒した相手カード（相手墓地）の中から 1 枚選び、
          <HelpInlinePxIcon />
          と属性のかけらを獲得します。
        </>,
        '属性ごとの詳しい戦い方は、各カード詳細の「詳しい説明を見る」へ。',
      ],
    },
    {
      title: `Lv.${LOST_MIN_USER_LEVEL} からの敗北ペナルティ`,
      minLevel: LOST_MIN_USER_LEVEL,
      items: [
        `Lv.${LOST_MIN_USER_LEVEL} 未満は敗北してもカードをロストしません。`,
        `Lv.${LOST_MIN_USER_LEVEL} 以上で敗北すると、そのバトルで倒された自分のカードの中から 1 枚がロスト対象として抽選されます。`,
        `ロスト中のカードはバトルに出せません。デッキに ${DECK_MAX} 枚のカードが揃うまで通常 CPU 戦は開始できません。`,
      ],
    },
    {
      title: 'ロスト後の選択肢',
      minLevel: LOST_MIN_USER_LEVEL,
      items: [
        'カードをロストしたら、マイデッキのカード詳細画面で次の 3 通りから選びます。',
        <>
          「復活」：<HelpInlinePxIcon />
          を消費して復活できます（1 枚あたり最大 {REVIVE_CAP} 回まで）。
        </>,
        '「思い出アルバムに保存」：デッキから無償でアルバムに移動し、閲覧専用にします。',
        <>
          「削除」：<HelpInlineJewelCost amount={JEWEL_COST_DELETE} />
          を消費してデッキから削除。
          <HelpInlinePxIcon />
          と属性のかけらが返還されます。
        </>,
      ],
    },
    {
      title: '護符',
      minLevel: LOST_MIN_USER_LEVEL,
      items: [
        'カード詳細から護符を装備すると、次のロスト 1 回を防げます。',
        `Lv.${LOST_MIN_USER_LEVEL} 到達時やショップなどで護符を入手できます。`,
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
