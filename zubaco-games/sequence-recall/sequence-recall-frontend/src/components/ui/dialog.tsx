import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  children: ReactNode;
}

/**
 * Dialog.
 *
 * @param {DialogProps} props - Component props.
 * @param {boolean} props.open - The open.
 * @param {string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined} props.children - The children.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function Dialog({ open, children }: DialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
