import type {
  GameResultContentMap,
  ResultScreenLabels,
  StageId,
  StageInstructionContent,
  StageInstructionContentMap,
} from '@micro-screens/src';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type LocalizedInstructionContent = StageInstructionContent & {
  playNowButton: string;
  learnHowToPlay: string;
};

const STAGES = [1, 2, 3, 4] as const satisfies readonly StageId[];

export function useLocalizedMicroScreenContent() {
  const { t } = useTranslation();

  return useMemo(() => {
    const instructionContentByStage = STAGES.reduce<
      Partial<StageInstructionContentMap>
    >((acc, stage) => {
      acc[stage] = t(`instructions.stages.${stage}`, {
        returnObjects: true,
      }) as LocalizedInstructionContent;
      return acc;
    }, {});

    const success = t('results.success', {
      returnObjects: true,
    }) as ResultScreenLabels;
    const failure = t('results.failure', {
      returnObjects: true,
    }) as ResultScreenLabels;

    const successContentByStage = STAGES.reduce<Partial<GameResultContentMap>>(
      (acc, stage) => {
        acc[stage] = success;
        return acc;
      },
      {},
    );
    const failureContentByStage = STAGES.reduce<Partial<GameResultContentMap>>(
      (acc, stage) => {
        acc[stage] = failure;
        return acc;
      },
      {},
    );

    return {
      instructionContentByStage,
      successContentByStage,
      failureContentByStage,
    };
  }, [t]);
}
