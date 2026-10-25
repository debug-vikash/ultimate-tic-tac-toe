import { useEffect } from 'react';

export default function ResetConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isGameActive = false,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop confirm-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-container confirm-modal-container"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-reset-title"
        aria-describedby="confirm-reset-description"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header confirm-header">
          <div className="modal-title-wrap">
            <span className="modal-badge confirm-badge">CONFIRMATION REQUIRED</span>
            <h2 id="confirm-reset-title" className="modal-title">
              Clear History & Reset Scores?
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cancel reset and close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body confirm-body">
          <p id="confirm-reset-description" className="confirm-main-text">
            Are you sure you want to clear all recorded match history and reset session win/draw tallies to zero?
          </p>

          <div className="confirm-safety-notice">
            <span className="safety-icon">🛡️</span>
            <div className="safety-text">
              <strong>Active Game Protected:</strong>{' '}
              {isGameActive
                ? 'Your ongoing match in progress will NOT be reset or interrupted.'
                : 'Only session history and score tallies will be cleared.'}
            </div>
          </div>

          <p className="confirm-warning-note">
            ⚠️ This action cannot be undone. Saved session statistics in localStorage will be permanently cleared.
          </p>
        </div>

        <div className="modal-footer confirm-footer">
          <button
            type="button"
            className="btn btn-cancel"
            onClick={onClose}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger-confirm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Yes, Clear & Reset
          </button>
        </div>
      </div>
    </div>
  );
}
