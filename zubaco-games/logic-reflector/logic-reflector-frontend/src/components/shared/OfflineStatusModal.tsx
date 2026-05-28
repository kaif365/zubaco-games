import { RotateCcw, WifiOff } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { STAGE_THEME_COLORS } from "@/micro-screens/theme/colors";
import type { StageId } from "@/micro-screens/theme/colors";

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
    <div className="sp-offline-overlay" role="dialog" aria-modal="true">
      <div
        className="sp-offline-card"
        style={{
          background: `linear-gradient(135deg, ${theme.eclipse}, ${theme.background})`,
        }}
      >
        <div className="sp-offline-accent-line" />
        <div className="sp-offline-content">
          <div className="sp-offline-header">
            <div className="sp-offline-icon">
              <WifiOff size={20} />
            </div>
            <div>
              <p className="sp-offline-kicker">{t("offline.connectionLost")}</p>
              <h3 className="sp-offline-title">{t("offline.youAreOffline")}</h3>
            </div>
          </div>
          <div className="sp-offline-message">
            <p>{t("offline.message")}</p>
          </div>
          <button
            type="button"
            className="sp-offline-retry"
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
