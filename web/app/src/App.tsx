import { lazy, Suspense } from 'react';
import { UserApp } from './UserApp';

const AdminApp = lazy(() =>
  import('./admin/AdminApp').then(({ AdminApp: Component }) => ({ default: Component })),
);
const AdminDevApp = lazy(() =>
  import('./admin-dev/AdminDevApp').then(({ AdminDevApp: Component }) => ({ default: Component })),
);

/**
 * Unified frontend entry point.
 *
 * The existing user experience remains the default area. Knowledge Center
 * routes live under /admin and are served by the same frontend build while
 * preserving the original applications for a reversible migration.
 */
export function App() {
  const pathname = window.location.pathname;
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminDevArea = pathname === '/admin-dev' || pathname.startsWith('/admin-dev/');

  if (isAdminArea) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <AdminApp />
      </Suspense>
    );
  }

  if (isAdminDevArea) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <AdminDevApp />
      </Suspense>
    );
  }

  return <UserApp />;
}
