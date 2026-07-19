import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_PROFILE_COMMENT,
  PROFILE_COMMENT_MAX_LENGTH,
  PROFILE_COMMENT_MAX_LINES,
  finalizeProfileComment,
  profileCommentLength,
  sanitizeProfileCommentInput,
} from '../user';
import { useModalScrollLock } from './useModalScrollLock';

interface ProfileCommentEditModalProps {
  initialValue: string;
  onSave: (value: string | undefined) => void;
  onClose: () => void;
}

export function ProfileCommentEditModal({
  initialValue,
  onSave,
  onClose,
}: ProfileCommentEditModalProps) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [commentDraft, setCommentDraft] = useState(initialValue);

  useModalScrollLock(true);

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSave = () => {
    onSave(finalizeProfileComment(commentDraft));
    onClose();
  };

  return createPortal(
    <div className="profile-comment-edit-backdrop" onClick={onClose}>
      <div
        className="profile-comment-edit-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-comment-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="profile-comment-edit-title" className="profile-comment-edit-title">
          ひとこと
        </h2>
        <label className="profile-comment-edit-label" htmlFor={textareaId}>
          プロフィールに表示する一言を入力してください
        </label>
        <textarea
          ref={textareaRef}
          id={textareaId}
          className="profile-comment-edit-textarea"
          rows={PROFILE_COMMENT_MAX_LINES}
          value={commentDraft}
          placeholder={DEFAULT_PROFILE_COMMENT}
          onChange={(event) =>
            setCommentDraft(sanitizeProfileCommentInput(event.target.value))
          }
        />
        <div className="profile-comment-edit-meta">
          <span>個人情報や連絡先は入力しないでください</span>
          <span>
            {profileCommentLength(commentDraft)}/{PROFILE_COMMENT_MAX_LENGTH}
          </span>
        </div>
        <div className="profile-comment-edit-actions">
          <button
            type="button"
            className="profile-comment-edit-cancel"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="profile-comment-edit-save"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
