import { useMemo } from 'react';
import { formatBattleLog } from '../game/formatBattleLog';
import type { BattleEvent } from '../types/battle';

type TeamSide = 'player' | 'cpu';

interface ColoredSegment {
  text: string;
  team?: TeamSide;
}

function buildNameList(names: readonly string[]): string[] {
  return [...new Set(names)].sort((a, b) => b.length - a.length);
}

export function splitColoredLogLine(
  line: string,
  playerNames: readonly string[],
  cpuNames: readonly string[],
): ColoredSegment[] {
  const playerSet = new Set(playerNames);
  const cpuSet = new Set(cpuNames);
  const allNames = buildNameList([...playerNames, ...cpuNames]);
  const segments: ColoredSegment[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    let matchIndex = -1;
    let matchName = '';
    let matchTeam: TeamSide | undefined;

    for (const name of allNames) {
      const index = remaining.indexOf(name);
      if (index === -1) continue;
      if (matchIndex === -1 || index < matchIndex) {
        matchIndex = index;
        matchName = name;
        matchTeam = playerSet.has(name) ? 'player' : cpuSet.has(name) ? 'cpu' : undefined;
      }
    }

    if (matchIndex === -1) {
      segments.push({ text: remaining });
      break;
    }

    if (matchIndex > 0) {
      segments.push({ text: remaining.slice(0, matchIndex) });
    }
    segments.push({ text: matchName, team: matchTeam });
    remaining = remaining.slice(matchIndex + matchName.length);
  }

  return segments;
}

function ColoredLogLine({
  line,
  playerNames,
  cpuNames,
}: {
  line: string;
  playerNames: readonly string[];
  cpuNames: readonly string[];
}) {
  const segments = useMemo(
    () => splitColoredLogLine(line, playerNames, cpuNames),
    [line, playerNames, cpuNames],
  );

  return (
    <>
      {segments.map((segment, index) =>
        segment.team ? (
          <span
            key={`${index}-${segment.text}`}
            className={`formation-battle-log-name formation-battle-log-name-${segment.team}`}
          >
            {segment.text}
          </span>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </>
  );
}

export function FormationBattleLog({
  events,
  playerNames,
  cpuNames,
}: {
  events: readonly BattleEvent[];
  playerNames: readonly string[];
  cpuNames: readonly string[];
}) {
  const groups = formatBattleLog(events);

  return (
    <div className="formation-battle-log">
      <h2 className="formation-battle-log-title">バトルログ</h2>
      {groups.length === 0 ? (
        <p className="formation-battle-log-empty">ログがありません</p>
      ) : (
        <div className="formation-battle-log-scroll">
          {groups.map((group) => (
            <section
              key={group.turn}
              className="formation-battle-log-turn"
              aria-label={`ターン ${group.turn}`}
            >
              <h3 className="formation-battle-log-turn-label">
                TURN {group.turn}
              </h3>
              <ol className="formation-battle-log-lines">
                {group.lines.map((line, index) => (
                  <li key={`${group.turn}-${index}`}>
                    <ColoredLogLine
                      line={line}
                      playerNames={playerNames}
                      cpuNames={cpuNames}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
