import { RotateCcw, WifiOff } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const offlineModalSurfaceStyle: CSSProperties = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--stage-eclipse, #364bae) 40%, var(--stage-bg, #19224d)), var(--stage-bg, #19224d))',
};

export function OfflineStatusModal() {
  const { isOnline } = useNetworkStatus();
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setIsModalOpen(true);
    }
  }, [isOnline]);

  const handleRetry = () => {
    setIsPressed(true);
    setTimeout(() => { setIsPressed(false); }, 200);

    if (!isOnline) return;
    setIsRetrying(false);
    setIsModalOpen(false);
    // window.location.reload();
  };

  return (
    <Dialog open={isModalOpen}>
      <Card
        className="relative overflow-hidden rounded-[18px] border border-amber-400/30 bg-transparent shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        style={offlineModalSurfaceStyle}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-amber-300/30 bg-amber-500/10 text-amber-200">
              <WifiOff size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em]">
                {t('offline.connectionLost')}
              </p>
              <h3 className="text-lg font-semibold tracking-[0.06em]">
                {t('offline.youAreOffline')}
              </h3>
            </div>
          </div>

          <div className="rounded-[10px] border border-white/20 bg-black/25 p-3">
            <p className="text-sm leading-relaxed text-white-50/85">{t('offline.message')}</p>
          </div>

          <Button
            type="button"
            className="button buttonPrimary flex items-center gap-2 justify-center transition-transform duration-100"
            style={{ transform: isPressed ? 'scale(0.95)' : 'scale(1)' }}
            onClick={handleRetry}
          >
            <RotateCcw size={16} className={isRetrying ? 'animate-spin' : ''} />
            {t('offline.retry')}
          </Button>
        </CardContent>
      </Card>
    </Dialog>
  );
}
