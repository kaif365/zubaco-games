import { Link } from 'react-router-dom';

import { ROUTES } from '@app/router/routes';
import { Button } from '@components/ui/button';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-8xl font-extrabold tracking-tight">404</h1>
        <p className="text-muted-foreground text-xl">Page not found</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you were looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link to={ROUTES.HOME}>Go back home</Link>
      </Button>
    </main>
  );
}
