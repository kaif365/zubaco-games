
import { Toaster } from "sonner";

export function MazeToaster() {
  return (
    <Toaster
      position="bottom-center"
      expand={false}
      richColors
      theme="dark"
      closeButton
    />
  );
}
