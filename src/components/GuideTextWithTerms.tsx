import { Fragment } from 'react';
import {
  LINKABLE_BATTLE_GUIDE_TERMS,
  type BattleGuideTermId,
} from '../config/battleGuideCommon';

type GuideTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'term'; id: BattleGuideTermId; label: string };

function parseGuideText(text: string): GuideTextSegment[] {
  let segments: GuideTextSegment[] = [{ kind: 'text', value: text }];

  for (const term of LINKABLE_BATTLE_GUIDE_TERMS) {
    const next: GuideTextSegment[] = [];
    for (const segment of segments) {
      if (segment.kind !== 'text' || !segment.value.includes(term.label)) {
        next.push(segment);
        continue;
      }
      const parts = segment.value.split(term.label);
      parts.forEach((part, index) => {
        if (part) next.push({ kind: 'text', value: part });
        if (index < parts.length - 1) {
          next.push({ kind: 'term', id: term.id, label: term.label });
        }
      });
    }
    segments = next;
  }

  return segments;
}

interface GuideTextWithTermsProps {
  text: string;
  onTermPress: (termId: BattleGuideTermId) => void;
}

export function GuideTextWithTerms({ text, onTermPress }: GuideTextWithTermsProps) {
  const segments = parseGuideText(text);

  if (segments.length === 1 && segments[0]?.kind === 'text') {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <Fragment key={index}>{segment.value}</Fragment>;
        }
        return (
          <button
            key={index}
            type="button"
            className="guide-term-link"
            onClick={() => onTermPress(segment.id)}
          >
            {segment.label}
          </button>
        );
      })}
    </>
  );
}
