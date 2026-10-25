import { useState } from 'react';

export default function OnlineLobby({
  socketConnected,
  onlineRoom,
  mySymbol,
  onlineError,
  onClearError,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onRequestRematch,
  isCreating,
  isJoining,
  playerName,
  onUpdatePlayerName,
}) {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!onlineRoom?.roomCode) return;
    try {
      await navigator.clipboard.writeText(onlineRoom.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    onJoinRoom(cleanCode);
  };

  // Case 1: Already inside an online room
  if (onlineRoom) {
    const isWaiting = !onlineRoom.players.O;
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    const opponent = onlineRoom.players[opponentSymbol];
    const opponentConnected = Boolean(opponent?.connected);
    const rematchRequestedByMe = Boolean(onlineRoom.rematchRequests?.[mySymbol]);
    const rematchRequestedByOpponent = Boolean(onlineRoom.rematchRequests?.[opponentSymbol]);
    const isGameOver = onlineRoom.gameState?.overallWinner !== null;

    return (
      <section className="online-room-banner" aria-label="Online Room Details">
        <div className="room-banner-top">
          <div className="room-code-badge-wrap">
            <span className="room-code-label">ROOM CODE:</span>
            <span className="room-code-value" title="Share this code with your friend">
              {onlineRoom.roomCode}
            </span>
            <button
              type="button"
              className="btn btn-copy-code"
              onClick={handleCopyCode}
              title="Copy room code to clipboard"
              aria-label="Copy room code"
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="room-banner-actions">
            <button
              type="button"
              className="btn btn-leave-room"
              onClick={onLeaveRoom}
              title="Leave this multiplayer room"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Status indicator row */}
        <div className="room-status-row">
          <div className="my-role-badge">
            <span>You: </span>
            <strong className={`role-symbol ${mySymbol === 'X' ? 'symbol-x' : 'symbol-o'}`}>
              Player {mySymbol}
            </strong>
          </div>

          <div className="connection-status-pill">
            {isWaiting ? (
              <span className="status-waiting">
                <span className="pulsing-dot" /> Waiting for opponent to join...
              </span>
            ) : !opponentConnected ? (
              <span className="status-disconnected">
                <span className="warning-dot" /> Opponent disconnected
              </span>
            ) : (
              <span className="status-connected">
                <span className="online-dot" /> Opponent connected: {opponent?.name || 'Player ' + opponentSymbol}
              </span>
            )}
          </div>
        </div>

        {/* Rematch action banner when match is over */}
        {isGameOver && (
          <div className="rematch-action-banner" aria-label="Rematch options">
            <div className="rematch-status-text">
              {rematchRequestedByMe && !rematchRequestedByOpponent && (
                <span>Rematch requested. Waiting for opponent to accept...</span>
              )}
              {!rematchRequestedByMe && rematchRequestedByOpponent && (
                <span>Opponent wants a rematch!</span>
              )}
              {!rematchRequestedByMe && !rematchRequestedByOpponent && (
                <span>Game over! Would you like a rematch?</span>
              )}
            </div>

            <button
              type="button"
              className={`btn btn-rematch ${rematchRequestedByMe ? 'btn-rematch-pending' : ''}`}
              onClick={onRequestRematch}
              disabled={rematchRequestedByMe}
              title={rematchRequestedByMe ? 'Waiting for opponent...' : 'Request a rematch with new board'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>{rematchRequestedByOpponent ? 'Accept Rematch' : (rematchRequestedByMe ? 'Waiting...' : 'Request Rematch')}</span>
            </button>
          </div>
        )}

        {onlineError && (
          <div className="online-error-banner" role="alert">
            <span>{onlineError}</span>
            <button type="button" className="btn-dismiss-error" onClick={onClearError} title="Dismiss">
              ×
            </button>
          </div>
        )}
      </section>
    );
  }

  // Case 2: In Online Mode but not in a room yet (Lobby view)
  return (
    <section className="online-lobby-container" aria-label="Online Multiplayer Lobby">
      <div className="lobby-header">
        <h2 className="lobby-title">ONLINE MULTIPLAYER</h2>
        <p className="lobby-subtitle">
          Battle friends over the internet in real time with server-authoritative rules.
        </p>
      </div>

      {/* Socket connection indicator */}
      {!socketConnected && (
        <div className="connection-banner connecting" role="status">
          <span className="pulsing-dot" />
          <span>Connecting to game server...</span>
        </div>
      )}

      {onlineError && (
        <div className="online-error-banner" role="alert">
          <span>{onlineError}</span>
          <button type="button" className="btn-dismiss-error" onClick={onClearError} title="Dismiss">
            ×
          </button>
        </div>
      )}

      {/* Player Display Name Input */}
      <div className="lobby-name-field">
        <label htmlFor="online-player-name-input" className="lobby-label">
          Your Display Name:
        </label>
        <input
          id="online-player-name-input"
          type="text"
          className="lobby-input name-input"
          value={playerName}
          maxLength={20}
          placeholder="Enter display name"
          onChange={(e) => onUpdatePlayerName(e.target.value)}
        />
      </div>

      <div className="lobby-cards-grid">
        {/* Create Room Card */}
        <div className="lobby-card create-card">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <h3 className="card-heading">Host New Match</h3>
          <p className="card-description">
            Create a private room and get a unique 6-character code to share with your opponent.
          </p>
          <button
            type="button"
            className="btn btn-lobby-action btn-create-room"
            onClick={onCreateRoom}
            disabled={!socketConnected || isCreating}
            title="Create a new online room"
          >
            {isCreating ? 'Creating Room...' : 'Create Private Room'}
          </button>
        </div>

        {/* Join Room Card */}
        <div className="lobby-card join-card">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h3 className="card-heading">Join a Friend</h3>
          <p className="card-description">
            Enter the 6-character code provided by your friend to join their match.
          </p>
          <form className="join-form" onSubmit={handleJoinSubmit}>
            <input
              type="text"
              className="lobby-input code-input"
              value={joinCodeInput}
              maxLength={6}
              placeholder="e.g. 7X9K2P"
              aria-label="Room code"
              autoCapitalize="characters"
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="btn btn-lobby-action btn-join-room"
              disabled={!socketConnected || isJoining || !joinCodeInput.trim()}
              title="Join the specified room"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
