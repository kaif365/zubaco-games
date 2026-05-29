import '../styles/game.css';

interface GameTimerProps {
  remainingMs: number;
}

export default function GameTimer({ remainingMs }: Readonly<GameTimerProps>) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  const isUrgent = totalSeconds > 0 && totalSeconds <= 15;

  return (
    <div className="puzzle-timer__pill">
      <div className="puzzle-timer__badge">
        <div className="puzzle-timer__content">
          <span className={`puzzle-timer__text${isUrgent ? ' puzzle-timer__text--urgent' : ''}`}>
            {/* Stopwatch icon */}
            <svg
              className="puzzle-timer__icon"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="15"
              viewBox="0 0 13 15"
              fill="none"
            >
              <path
                d="M6.44767 5.78274V8.44147L8.10938 9.4385M6.44767 2.79166C3.32736 2.79166 0.797852 5.32117 0.797852 8.44147C0.797852 11.5618 3.32736 14.0913 6.44767 14.0913C9.56797 14.0913 12.0975 11.5618 12.0975 8.44147C12.0975 5.32117 9.56797 2.79166 6.44767 2.79166ZM6.44767 2.79166V0.797607M5.1183 0.797607H7.77703M11.9838 3.18518L10.9868 2.18815L11.4853 2.68667M0.911526 3.18518L1.90855 2.18815L1.41004 2.68667"
                stroke="currentColor"
                strokeWidth="1.59524"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span className="puzzle-timer__value">
              {minutes}:{seconds}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
