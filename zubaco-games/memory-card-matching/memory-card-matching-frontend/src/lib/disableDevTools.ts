/**
 * Same behavior as sequence-recall `utils/security.ts`: block context menu,
 * common DevTools / view-source shortcuts, and copy/selection/drag on images.
 * Light deterrent only; not a security boundary.
 */

export function disableDevTools() {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }
    // Ctrl + Shift + I
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
      e.preventDefault();
      return;
    }
    // Cmd + Option + I (Mac)
    if (e.metaKey && e.altKey && e.code === 'KeyI') {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + Shift + C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyC') {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + U (View source)
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyU') {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + S (Save page)
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + A (Select all)
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
      e.preventDefault();
      return;
    }
  };

  window.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('keydown', handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}

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

  // Prevent long-press save on mobile
  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.preventDefault();
    }
  };

  window.addEventListener('copy', handleCopy);
  window.addEventListener('cut', handleCut);
  window.addEventListener('dragstart', handleDragStart);
  window.addEventListener('touchstart', handleTouchStart, { passive: false });

  return () => {
    window.removeEventListener('copy', handleCopy);
    window.removeEventListener('cut', handleCut);
    window.removeEventListener('dragstart', handleDragStart);
    window.removeEventListener('touchstart', handleTouchStart);
  };
}
