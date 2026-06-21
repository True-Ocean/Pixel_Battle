interface MissionCompleteToastProps {
  message: string;
}

export function MissionCompleteToast({ message }: MissionCompleteToastProps) {
  return (
    <div className="mission-complete-toast-wrap" role="status" aria-live="polite">
      <div className="mission-complete-toast">
        <p className="mission-complete-toast-message">{message}</p>
      </div>
    </div>
  );
}
