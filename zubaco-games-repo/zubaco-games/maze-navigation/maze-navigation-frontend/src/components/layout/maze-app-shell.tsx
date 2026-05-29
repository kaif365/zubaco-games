import type { ReactNode } from "react";
import "./maze-app-shell.css";

interface MazeAppShellProps {
  readonly children: ReactNode;
}

export function MazeAppShell({ children }: MazeAppShellProps) {
  return (
    <div className="maze-app-shell">
      <div className="maze-app-shell__background" aria-hidden />
      <div className="maze-app-shell__inner">{children}</div>
    </div>
  );
}
