import { createPortal } from 'react-dom';
import type { HelpTopic } from '../config/helpContent';
import { useModalScrollLock } from './useModalScrollLock';

interface HelpPanelModalProps {
  topic: HelpTopic;
  onClose: () => void;
  panelClassName?: string;
}

export function HelpPanelModal({ topic, onClose, panelClassName }: HelpPanelModalProps) {
  useModalScrollLock(true);

  const titleId = 'help-panel-title';
  const panelClassNames = ['help-panel', panelClassName].filter(Boolean).join(' ');

  return createPortal(
    <div className="help-panel-backdrop" onClick={onClose}>
      <div
        className={panelClassNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="help-panel-title">
          {topic.title}
        </h2>
        <div className="help-panel-scroll">
          {topic.sections.map((section, sectionIndex) => (
            <section key={sectionIndex} className="help-panel-section">
              {section.title != null && section.title !== '' && (
                <h3 className="help-panel-section-title">{section.title}</h3>
              )}
              <ul className="help-panel-list">
                {section.items.map((item, index) => (
                  <li key={`${sectionIndex}-${index}`}>{item}</li>
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
