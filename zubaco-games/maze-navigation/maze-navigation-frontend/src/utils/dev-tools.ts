/**
 * Registers listeners that block common ways to open devtools or inspect the page.
 * This is obfuscation only — not a security boundary.
 */
export function disableDevTools() {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "F12") {
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && e.shiftKey && e.code === "KeyI") {
      e.preventDefault();
      return;
    }
    if (e.metaKey && e.altKey && e.code === "KeyI") {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyC") {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyU") {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyA") {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyC") {
      e.preventDefault();
    }
  };

  globalThis.addEventListener("contextmenu", handleContextMenu);
  globalThis.addEventListener("keydown", handleKeyDown, { capture: true });

  return () => {
    globalThis.removeEventListener("contextmenu", handleContextMenu);
    globalThis.removeEventListener("keydown", handleKeyDown, { capture: true });
  };
}

/** Blocks copy, cut, drag-start, and long-press save on images (mobile). */
export function disableCopyAndSelection() {
  const handleCopy = (e: ClipboardEvent) => {
    e.preventDefault();
  };

  const handleCut = (e: ClipboardEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      e.preventDefault();
    }
  };

  globalThis.addEventListener("copy", handleCopy);
  globalThis.addEventListener("cut", handleCut);
  globalThis.addEventListener("dragstart", handleDragStart);
  globalThis.addEventListener("touchstart", handleTouchStart, {
    passive: false,
  });

  return () => {
    globalThis.removeEventListener("copy", handleCopy);
    globalThis.removeEventListener("cut", handleCut);
    globalThis.removeEventListener("dragstart", handleDragStart);
    globalThis.removeEventListener("touchstart", handleTouchStart);
  };
}
