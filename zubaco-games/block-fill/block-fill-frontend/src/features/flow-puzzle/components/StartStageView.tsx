import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/alert';

interface StartStageViewProps {
  initLoading: boolean;
  initError: string | null;
  startError: string | null;
  isStartingStage: boolean;
  onStart: () => void;
}

/**
 * Renders the pre-game start screen with loading, error, and start button states.
 *
 * @param props Component props
 */
export function StartStageView({
  initLoading,
  initError,
  startError,
  isStartingStage,
  onStart,
}: StartStageViewProps) {
  return (
    <>
      <div className="flex flex-col justify-center items-center min-h-[96vh]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 border rounded-xl border-brown bg-card-bg bg-white/5 px-6 py-10 text-center sm:px-8 sm:py-12 min-h-[300px]">
          <h1 className="text-4xl font-serif font-semibold text-foreground sm:text-5xl">Stage 1</h1>

          {initLoading ? (
            <Loader text="Initializing…" />
          ) : initError ? (
            <Alert variant="error" title="Initialization Failed" description={initError} />
          ) : (
            <>
              {startError ? (
                <Alert variant="error" title="Start Failed" description={startError} />
              ) : null}
              <Button
                className="rounded-full btn-play border border-btn text-black !text-lg !font-semibold px-10 py-6 cursor-pointer"
                onClick={onStart}
                disabled={isStartingStage}
              >
                {/* <Play size={16} /> */}
                {isStartingStage ? 'Starting…' : 'Start'}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
