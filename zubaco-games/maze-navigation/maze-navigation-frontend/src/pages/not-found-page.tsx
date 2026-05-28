import { useNavigate } from "react-router-dom";

import { paths } from "@app/router/routes";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <button
        type="button"
        className="rounded-full border px-4 py-2 text-sm"
        onClick={() => {
          navigate(paths.home);
        }}
      >
        Go home
      </button>
    </main>
  );
}
