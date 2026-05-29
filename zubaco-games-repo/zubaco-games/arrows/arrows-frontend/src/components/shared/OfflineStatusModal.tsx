import { RotateCcw, WifiOff } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { STAGE_THEME_COLORS } from "@micro-screens/theme/colors";
import type { StageId } from "@micro-screens/src/types/stage-theme";

interface OfflineStatusModalProps {
  isOpen: boolean;
  stage: StageId;
  onRetry: () => void;
}

export function OfflineStatusModal({ isOpen, stage, onRetry }: OfflineStatusModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const theme = STAGE_THEME_COLORS[stage];

  return createPortal(
    <div className="offline-modal-overlay" role="dialog" aria-modal="true">
      <div
        className="offline-modal-card"
        style={{
          background: `linear-gradient(135deg, ${theme.eclipse}, ${theme.background})`,
        }}
      >
        <div className="offline-modal-accent-line" />
        <div className="offline-modal-content">
          <div className="offline-modal-header">
            <div className="offline-modal-icon">
              <WifiOff size={20} />
            </div>
            <div>
              <p className="offline-modal-kicker">{t("offline.connectionLost")}</p>
              <h3 className="offline-modal-title">{t("offline.youAreOffline")}</h3>
            </div>
          </div>
          <div className="offline-modal-message">
            <p>{t("offline.message")}</p>
          </div>
          <button
            type="button"
            className="offline-modal-retry"
            onClick={onRetry}
          >
            <RotateCcw size={16} />
            {t("offline.retry")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
