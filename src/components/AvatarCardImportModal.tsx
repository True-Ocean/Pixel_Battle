import type { Card } from '../types';
import { CardImportModal } from './CardImportModal';

interface AvatarCardImportModalProps {
  cards: readonly Card[];
  onSelect: (card: Card) => void;
  onClose: () => void;
}

export function AvatarCardImportModal({
  cards,
  onSelect,
  onClose,
}: AvatarCardImportModalProps) {
  return (
    <CardImportModal
      cards={cards}
      onSelect={onSelect}
      onClose={onClose}
      titleId="avatar-card-import-title"
      description="アバターの元にするカードを選んでください。読み込み後も自由に編集できます。"
    />
  );
}
