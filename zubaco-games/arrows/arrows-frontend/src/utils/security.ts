export function disableDevTools() {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // F12
    if (e.key === "F12") {
      e.preventDefault();
      return;
    }
    // Ctrl + Shift + I
    if (e.ctrlKey && e.shiftKey && e.code === "KeyI") {
      e.preventDefault();
      return;
    }
    // Cmd + Option + I (Mac)
    if (e.metaKey && e.altKey && e.code === "KeyI") {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + Shift + C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyC") {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + U (View source)
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyU") {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + S (Save page)
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + A (Select all)
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyA") {
      e.preventDefault();
      return;
    }
    // Ctrl/Cmd + C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyC") {
      e.preventDefault();
      return;
    }
  };

  window.addEventListener("contextmenu", handleContextMenu);
  window.addEventListener("keydown", handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener("contextmenu", handleContextMenu);
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  };
}
