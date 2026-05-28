/**
 * Gets timer text color.
 *
 * @param {boolean} isCritical - The is critical.
 * @param {boolean} isWarning - The is warning.
 *
 * @returns {string} The result of getTimerTextColor.
 */
function getTimerTextColor(isCritical: boolean, isWarning: boolean): string {
  if (isCritical) return 'timer-badge__text--urgent timer-badge__text--running';
  if (isWarning) return 'timer-badge__text--urgent';
  return '';
}

/**
 * Formats time.
 *
 * @param {number} totalSeconds - The total seconds.
 *
 * @returns {string} The result of formatTime.
 */
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface SessionTimerBarProps {
  sessionTimerDisplay: number;
  sessionTimerSeconds: number;
  sessionTimerWarning: boolean;
  sessionTimerCritical: boolean;
  isDemo?: boolean;
  isLoading?: boolean;
}

/**
 * Session timer bar.
 *
 * @param {SessionTimerBarProps} props - Component props.
 * @param {number} props.sessionTimerDisplay - The session timer display.
 * @param {number} props.sessionTimerSeconds - The session timer seconds.
 * @param {boolean} props.sessionTimerWarning - The session timer warning.
 * @param {boolean} props.sessionTimerCritical - The session timer critical.
 * @param {boolean | undefined} [props.isDemo] - The is demo.
 * @param {boolean | undefined} [props.isLoading] - Whether the timer has not yet started.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function SessionTimerBar({
  sessionTimerDisplay,
  sessionTimerWarning,
  sessionTimerCritical,
  isDemo = false,
  isLoading = false,
}: SessionTimerBarProps) {
  const textColor = getTimerTextColor(sessionTimerCritical, sessionTimerWarning);
  const formattedTime = formatTime(sessionTimerDisplay);

  return (
    <div className="gameplay-header-inner">
      <div className="timer-badge">
        {isDemo ? (
          <span className="timer-badge__content timer-badge__text justify-center">Demo</span>
        ) : isLoading ? (
          <span className="timer-badge__content">
            <span className="flex items-center justify-center gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse"
                  style={{ animationDelay: `${(i * 0.2).toString()}s` }}
                />
              ))}
            </span>
          </span>
        ) : (
          <span
            className={`timer-badge__content timer-badge__text flex items-center gap-[7px] ${textColor}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              data-locator-target="vscode"
            >
              <g clipPath="url(#clip0_1399_11540)">
                <path
                  d="M7.97794 6.31325V8.97199L9.63965 9.96902M7.97794 3.32218C4.85763 3.32218 2.32812 5.85168 2.32812 8.97199C2.32812 12.0923 4.85763 14.6218 7.97794 14.6218C11.0982 14.6218 13.6278 12.0923 13.6278 8.97199C13.6278 5.85168 11.0982 3.32218 7.97794 3.32218ZM7.97794 3.32218V1.32812M6.64857 1.32812H9.30731M13.5141 3.7157L12.5171 2.71867L13.0156 3.21718M2.4418 3.7157L3.43883 2.71867L2.94031 3.21718"
                  stroke="currentColor"
                  strokeWidth="1.59524"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_1399_11540">
                  <rect width="15.9524" height="15.9524" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <span className="timer-badge__value timer-badge__value--clock">{formattedTime}</span>
          </span>
        )}
      </div>
    </div>
  );
}
