import { useEffect } from 'react';

export default function RulesModal({ isOpen, onClose }) {
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
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-badge">TACTICAL GUIDE</span>
            <h2 id="rules-title" className="modal-title">How to Play Ultimate Tic-Tac-Toe</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close rules guide"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <section className="rule-card">
            <div className="rule-number">1</div>
            <div className="rule-content">
              <h3>The 3×3 of 3×3s</h3>
              <p>
                The game board consists of 9 mini Tic-Tac-Toe boards arranged in a large 3×3 macro grid. Player 1 starts with <strong>X</strong>, Player 2 uses <strong>O</strong>.
              </p>
            </div>
          </section>

          <section className="rule-card">
            <div className="rule-number">2</div>
            <div className="rule-content">
              <h3>Send Your Opponent</h3>
              <p>
                The cell you choose within a mini-board dictates which mini-board your opponent must play in next!
              </p>
              <div className="rule-example">
                <em>Example:</em> Playing in the <strong>center cell</strong> of any mini-board forces your opponent to play their next move in the <strong>center mini-board</strong> of the macro grid.
              </div>
            </div>
          </section>

          <section className="rule-card">
            <div className="rule-number">3</div>
            <div className="rule-content">
              <h3>Capturing Mini-Boards</h3>
              <p>
                Get 3 matching marks in a horizontal, vertical, or diagonal line to win a mini-board. Once won, that mini-board is permanently closed and displays your symbol!
              </p>
            </div>
          </section>

          <section className="rule-card">
            <div className="rule-number">4</div>
            <div className="rule-content">
              <h3>Free Choice Rule (Crucial Tactic!)</h3>
              <p>
                If a player is directed to a mini-board that has <strong>already been won or drawn</strong>, they receive a <strong>Free Choice</strong> turn: they may play on <em>any</em> available open board!
              </p>
            </div>
          </section>

          <section className="rule-card highlight-card">
            <div className="rule-number">★</div>
            <div className="rule-content">
              <h3>Ultimate Victory</h3>
              <p>
                Capture <strong>3 mini-boards in a row</strong> (horizontally, vertically, or diagonally) on the macro board to win the entire game. If all 9 boards are completed without 3-in-a-row, the game ends in a draw.
              </p>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
}
