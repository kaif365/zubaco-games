import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-6xl font-black text-primary opacity-60">404</p>
      <p className="text-muted-foreground">Page not found.</p>
      <Link
        to="/"
        className="rounded-xl bg-primary text-primary-foreground px-6 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Back to Game
      </Link>
    </div>
  );
}
