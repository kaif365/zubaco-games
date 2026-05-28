interface PageLoaderProps {
  /** Primary status line below the spinner. */
  message?: string;
  /** Smaller helper text (e.g. temporary integration note). */
  footnote?: string;
}

/**
 * Page loader.
 *
 * @param {PageLoaderProps} props - Component props.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function PageLoader({ message, footnote }: PageLoaderProps) {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center gap-6 px-6"
      style={{ background: '#0e0805' }}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-400" />
      {message ? (
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium tracking-wide text-amber-100/90">{message}</p>
          {footnote ? (
            <p className="text-xs leading-relaxed text-amber-200/45">{footnote}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
