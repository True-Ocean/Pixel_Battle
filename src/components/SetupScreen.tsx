import { useState } from 'react';
import { USERNAME_MAX_LENGTH } from '../config/balance';
import { createInitialProfile, validateUsername } from '../user';

interface SetupScreenProps {
  onComplete: (username: string) => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      createInitialProfile(username);
      setError(null);
      onComplete(username.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    }
  };

  return (
    <section className="screen screen-setup">
      <div className="setup-header">
        <h1>はじめまして！</h1>
        <p className="muted setup-subtitle">
          バトルを始める前に、ユーザー名を決めてください
        </p>
      </div>

      <div className="setup-body">
        <label className="field setup-field">
          <span>ユーザー名</span>
          <input
            type="text"
            value={username}
            maxLength={USERNAME_MAX_LENGTH}
            autoComplete="username"
            placeholder="例：ピクセル太郎"
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </label>
        <p className="muted setup-hint">
          {USERNAME_MAX_LENGTH} 文字以内・Lv.1 からスタートします
        </p>
        {error && <p className="error setup-error">{error}</p>}
      </div>

      <div className="setup-actions">
        <button type="button" className="primary" onClick={handleSubmit}>
          はじめる
        </button>
      </div>
    </section>
  );
}
