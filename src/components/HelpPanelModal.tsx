import { createPortal } from 'react-dom';
import type { HelpTopic } from '../config/helpContent';
import { useModalScrollLock } from './useModalScrollLock';

interface HelpPanelModalProps {
  topic: HelpTopic;
  onClose: () => void;
}

export function HelpPanelModal({ topic, onClose }: HelpPanelModalProps) {
  useModalScrollLock(true);

  const titleId = 'help-panel-title';

  return createPortal(
    <div className="help-panel-backdrop" onClick={onClose}>
      <div
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="help-panel-title">
          {topic.title}
        </h2>
        <div className="help-panel-scroll">
          {topic.sections.map((section) => (
            <section key={section.title} className="help-panel-section">
              <h3 className="help-panel-section-title">{section.title}</h3>
              <ul className="help-panel-list">
                {section.items.map((item, index) => (
                  <li key={`${section.title}-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="help-panel-actions">
          <button type="button" className="help-panel-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
