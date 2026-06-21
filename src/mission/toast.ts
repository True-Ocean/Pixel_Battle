import type { MissionDefinition } from './types';

/** ミッション達成トーストの文言 */
export function formatMissionCompleteToastMessage(
  missions: ReadonlyArray<Pick<MissionDefinition, 'title'>>,
): string | null {
  if (missions.length === 0) return null;
  if (missions.length === 1) {
    return 'ミッション達成！報酬を受け取ろう';
  }
  return `${missions.length}件のミッション達成！報酬を受け取ろう`;
}
