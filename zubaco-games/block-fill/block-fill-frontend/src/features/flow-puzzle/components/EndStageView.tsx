import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface EndStageViewProps {
  onPlayAgain: () => void;
  onExit?: () => void;
  finalScore: number | null;
  isLoadingScore: boolean;
  scoreError: string | null;
}

/**
 * Renders the post-game end screen with play-again and optional exit actions.
 *
 * @param props Component props
 */
export function EndStageView({
  onPlayAgain,
  onExit,
  finalScore,
  isLoadingScore,
  scoreError,
}: EndStageViewProps) {
  return (
    <>
      <div className="flex flex-col justify-center items-center min-h-[96vh]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 border rounded-xl border-brown bg-card-bg bg-white/5 px-6 py-10 text-center sm:px-8 sm:py-12 min-h-[300px]">
          <h1 className="text-4xl font-serif font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">
            Stage Complete
          </h1>
          <p className="text-center text-sm text-white font-sans font-medium">
            You cleared this stage session.
          </p>
          {isLoadingScore ? (
            <div className="w-full max-w-xs animate-pulse rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mx-auto h-3 w-24 rounded bg-white/15" />
              <div className="mx-auto mt-3 h-10 w-20 rounded bg-white/20" />
            </div>
          ) : (
            <div className="rounded-2xl border border-brown bg-white/5 px-5 py-3">
              <p className="text-white font-sans font-medium text-sm capitalize">Final Score</p>
              <p className="mt-1 text-5xl font-semibold text-foreground">{finalScore ?? 0}</p>
            </div>
          )}
          {scoreError ? <Alert variant="error" title="Score Error" description={scoreError} /> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="rounded-full btn-play px-10 py-5 font-sans !font-semibold cursor-pointer"
              onClick={onPlayAgain}
            >
              Play Again
            </Button>
            {onExit ? (
              <Button
                variant="secondary"
                className="rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={onExit}
              >
                Exit
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
