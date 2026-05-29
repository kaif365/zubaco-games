import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'danger';
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog.
 *
 * @param {ConfirmationDialogProps} props - Component props.
 * @param {boolean} props.open - The open.
 * @param {string} props.title - The title.
 * @param {string} props.description - The description.
 * @param {string} props.confirmLabel - The confirm label.
 * @param {string | undefined} [props.cancelLabel] - The cancel label.
 * @param {"default" | "danger" | undefined} [props.confirmVariant] - The confirm variant.
 * @param {boolean | undefined} [props.isConfirming] - The is confirming.
 * @param {() => void} props.onConfirm - The on confirm.
 * @param {() => void} props.onCancel - The on cancel.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={open}>
      <Card className="overflow-hidden rounded-[28px] border-cyan-300/25 bg-[linear-gradient(180deg,rgba(9,17,38,0.98),rgba(6,10,24,0.98))] shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
        <CardHeader className="relative space-y-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-200">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/45">
                Confirmation
              </p>
              <CardTitle className="mt-1 text-xl text-cyan-50">{title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-[20px] border border-cyan-200/10 bg-slate-950/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-sm leading-relaxed text-slate-200">{description}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full border-cyan-200/20 text-cyan-100 hover:bg-cyan-500/10 sm:w-auto"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            className={`w-full sm:w-auto ${
              confirmVariant === 'danger'
                ? 'bg-rose-500 text-white hover:bg-rose-400'
                : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
            }`}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </Dialog>
  );
}
