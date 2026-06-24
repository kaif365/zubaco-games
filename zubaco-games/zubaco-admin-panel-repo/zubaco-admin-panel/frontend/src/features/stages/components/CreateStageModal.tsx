"use client";

import { StageUpsertDrawer } from "./StageUpsertDrawer";

interface CreateStageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStageModal({ isOpen, onClose }: CreateStageModalProps) {
  return <StageUpsertDrawer mode="create" isOpen={isOpen} onClose={onClose} />;
}

