import type {
  MissionDefinition,
  MissionEventType,
  MissionReward,
  MissionState,
} from '../mission/types';

/** 常設カウンター: 初回上限 */
export const PERMANENT_INITIAL_TIER_CAP = 200;

/** 常設カウンター: 上限到達ごとに +100（200→300→400…） */
export const PERMANENT_TIER_CAP_INCREMENT = 100;

/** 常設カウンター: goal の刻み */
export const PERMANENT_GOAL_STEP = 20;

export interface PermanentCounterSpec {
  eventType: MissionEventType;
  idPrefix: string;
  title: (goal: number) => string;
  description: (goal: number) => string;
}

export const PERMANENT_COUNTER_SPECS: readonly PermanentCounterSpec[] = [
  {
    eventType: 'cpu_battle_win',
    idPrefix: 'permanent_cpu_battle_win',
    title: (goal) => `CPU戦${goal}勝`,
    description: (goal) => `CPU戦に累計${goal}回勝利する`,
  },
  {
    eventType: 'card_created',
    idPrefix: 'permanent_card_created',
    title: (goal) => `累計${goal}枚作成`,
    description: (goal) => `カードを累計${goal}枚作成する`,
  },
  {
    eventType: 'card_edit_saved',
    idPrefix: 'permanent_card_edit_saved',
    title: (goal) => `累計${goal}回編集`,
    description: (goal) => `カードを累計${goal}回編集して保存する`,
  },
  {
    eventType: 'attribute_retouch',
    idPrefix: 'permanent_attribute_retouch',
    title: (goal) => `属性リタッチ${goal}回`,
    description: (goal) => `属性リタッチを累計${goal}回行う`,
  },
  {
    eventType: 'limit_break',
    idPrefix: 'permanent_limit_break',
    title: (goal) => `限界突破${goal}回`,
    description: (goal) => `限界突破を累計${goal}回行う`,
  },
  {
    eventType: 'memory_album_saved',
    idPrefix: 'permanent_memory_album_saved',
    title: (goal) => `思い出${goal}枚`,
    description: (goal) => `思い出アルバムに累計${goal}枚保存する`,
  },
  {
    eventType: 'card_revived',
    idPrefix: 'permanent_card_revived',
    title: (goal) => `復活${goal}回`,
    description: (goal) => `ロストカードを累計${goal}回復活させる`,
  },
  {
    eventType: 'card_deleted',
    idPrefix: 'permanent_card_deleted',
    title: (goal) => `削除${goal}枚`,
    description: (goal) => `カードを累計${goal}枚削除する`,
  },
  {
    eventType: 'card_renamed',
    idPrefix: 'permanent_card_renamed',
    title: (goal) => `リネーム${goal}回`,
    description: (goal) => `カード名を累計${goal}回変更して保存する`,
  },
  {
    eventType: 'card_note_saved',
    idPrefix: 'permanent_card_note_saved',
    title: (goal) => `ノート${goal}枚`,
    description: (goal) => `累計${goal}枚のカードにノートを付ける`,
  },
  {
    eventType: 'canvas_resized',
    idPrefix: 'permanent_canvas_resized',
    title: (goal) => `リサイズ${goal}回`,
    description: (goal) => `キャンバスサイズを変更して累計${goal}回保存する`,
  },
  {
    eventType: 'attribute_selected',
    idPrefix: 'permanent_attribute_selected',
    title: (goal) => `属性セレクト${goal}回`,
    description: (goal) => `属性セレクトを累計${goal}回行う`,
  },
];

const PERMANENT_COUNTER_SPEC_BY_PREFIX = new Map(
  PERMANENT_COUNTER_SPECS.map((spec) => [spec.idPrefix, spec]),
);

export const PERMANENT_COLLECTION_MISSION_ID = 'permanent_attribute_collection_all';

const PERMANENT_COLLECTION_MISSIONS: readonly MissionDefinition[] = [
  {
    id: PERMANENT_COLLECTION_MISSION_ID,
    category: 'permanent',
    title: '全属性コンプリート',
    description: '11属性すべてのカードを所持する',
    eventType: 'attribute_collection_complete',
    goal: 1,
    reward: { jewels: 10 },
  },
];

export function buildPermanentGoalsUpTo(maxGoal: number): number[] {
  const goals: number[] = [];
  for (let goal = PERMANENT_GOAL_STEP; goal <= maxGoal; goal += PERMANENT_GOAL_STEP) {
    goals.push(goal);
  }
  return goals;
}

export function permanentRewardForGoal(goal: number): MissionReward {
  if (goal % 100 === 0) {
    return { jewels: 10 };
  }
  return { px: 20 };
}

export function getPermanentCounterSpecByPrefix(
  idPrefix: string,
): PermanentCounterSpec | undefined {
  return PERMANENT_COUNTER_SPEC_BY_PREFIX.get(idPrefix);
}

export function parsePermanentCounterMissionId(
  missionId: string,
): { idPrefix: string; goal: number } | null {
  const match = missionId.match(/^(permanent_[a-z_]+)_(\d+)$/);
  if (!match) return null;
  const idPrefix = match[1]!;
  const goal = Number(match[2]);
  if (!Number.isFinite(goal) || goal <= 0 || goal % PERMANENT_GOAL_STEP !== 0) {
    return null;
  }
  if (!PERMANENT_COUNTER_SPEC_BY_PREFIX.has(idPrefix)) return null;
  return { idPrefix, goal };
}

export function getPermanentTierCap(
  state: MissionState,
  idPrefix: string,
): number {
  const cap = state.permanentTierCaps?.[idPrefix];
  if (cap != null && Number.isFinite(cap) && cap >= PERMANENT_INITIAL_TIER_CAP) {
    return Math.floor(cap);
  }
  return PERMANENT_INITIAL_TIER_CAP;
}

export function buildPermanentCounterMission(
  spec: PermanentCounterSpec,
  goal: number,
): MissionDefinition {
  return {
    id: `${spec.idPrefix}_${goal}`,
    category: 'permanent',
    title: spec.title(goal),
    description: spec.description(goal),
    eventType: spec.eventType,
    goal,
    reward: permanentRewardForGoal(goal),
  };
}

export function buildPermanentCounterMissionById(
  missionId: string,
): MissionDefinition | undefined {
  const parsed = parsePermanentCounterMissionId(missionId);
  if (!parsed) return undefined;
  const spec = getPermanentCounterSpecByPrefix(parsed.idPrefix);
  if (!spec) return undefined;
  return buildPermanentCounterMission(spec, parsed.goal);
}

export function getActivePermanentCounterMissions(
  state: MissionState,
): MissionDefinition[] {
  const missions: MissionDefinition[] = [];
  for (const spec of PERMANENT_COUNTER_SPECS) {
    const tierCap = getPermanentTierCap(state, spec.idPrefix);
    for (const goal of buildPermanentGoalsUpTo(tierCap)) {
      missions.push(buildPermanentCounterMission(spec, goal));
    }
  }
  return missions;
}

export function getPermanentCollectionMissions(): readonly MissionDefinition[] {
  return PERMANENT_COLLECTION_MISSIONS;
}

export function getActivePermanentMissions(
  state: MissionState,
): MissionDefinition[] {
  return [
    ...getActivePermanentCounterMissions(state),
    ...PERMANENT_COLLECTION_MISSIONS,
  ];
}

function getPermanentCounterBaselineProgress(
  state: MissionState,
  idPrefix: string,
  upToCap: number,
): number {
  let max = 0;
  for (const goal of buildPermanentGoalsUpTo(upToCap)) {
    const entry = state.entries[`${idPrefix}_${goal}`];
    if (entry) {
      max = Math.max(max, entry.progress);
    }
  }
  return max;
}

/** 常設カウンターの tier cap 到達ミッション受取後、次の 100 段を追加 */
export function expandPermanentTierCapAfterClaim(
  state: MissionState,
  mission: MissionDefinition,
  date: Date,
): MissionState {
  if (mission.category !== 'permanent') return state;

  const parsed = parsePermanentCounterMissionId(mission.id);
  if (!parsed) return state;

  const currentCap = getPermanentTierCap(state, parsed.idPrefix);
  if (parsed.goal !== currentCap) return state;

  const newCap = currentCap + PERMANENT_TIER_CAP_INCREMENT;
  const baseline = getPermanentCounterBaselineProgress(
    state,
    parsed.idPrefix,
    currentCap,
  );
  const nextEntries = { ...state.entries };

  for (
    let goal = currentCap + PERMANENT_GOAL_STEP;
    goal <= newCap;
    goal += PERMANENT_GOAL_STEP
  ) {
    const missionId = `${parsed.idPrefix}_${goal}`;
    if (nextEntries[missionId]) continue;
    const progress = Math.min(goal, baseline);
    nextEntries[missionId] = {
      progress,
      ...(progress >= goal ? { completedAt: date.toISOString() } : {}),
    };
  }

  return {
    ...state,
    permanentTierCaps: {
      ...state.permanentTierCaps,
      [parsed.idPrefix]: newCap,
    },
    entries: nextEntries,
  };
}
