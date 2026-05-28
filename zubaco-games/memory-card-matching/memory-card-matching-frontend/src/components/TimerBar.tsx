import { formatTime } from '@/game/gameUtils';
import { memo } from 'react';

interface TimerBarProps {
  timeRemaining: number;
}

const TimerBar = memo(({ timeRemaining }: TimerBarProps) => {
  const timerText = formatTime(timeRemaining);
  const isUrgent = timeRemaining <= 10;

  return (
    <div className="gameplay-header-inner">
      <div className="timer-badge">
        <div className="timer-badge__content">
          <span
            className={[
              'timer-badge__text flex items-center gap-[7px]',
              isUrgent ? 'timer-badge__text--urgent timer-badge__text--running' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <svg
              className="timer-badge__icon"
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
            <span className="timer-badge__value timer-badge__value--clock">{timerText}</span>
          </span>
        </div>
      </div>
    </div>
  );
});

TimerBar.displayName = 'TimerBar';
export { TimerBar };
