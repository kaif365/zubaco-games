import { Link } from "react-router-dom";

import { Button } from "@components/ui/button";
import { ROUTES } from "@app/router/routes";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-page__content">
        <h1 className="not-found-page__title">404</h1>
        <p className="not-found-page__headline">Page not found</p>
        <p className="not-found-page__copy">
          The page you were looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link to={ROUTES.HOME}>Go back home</Link>
      </Button>
    </main>
  );
}
