export const stageContentKeys = {
  all: ['stageContent'] as const,
  byStage: (stageId: string, lang: string) => [...stageContentKeys.all, stageId, lang] as const,
};
