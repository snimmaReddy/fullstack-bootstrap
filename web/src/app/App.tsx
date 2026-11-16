import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { EntityDetailPage } from '../entity/EntityDetailPage';
import { EntityFormDrawer } from '../entity/EntityFormDrawer';
import { EntityListPage } from '../entity/EntityListPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppLayout } from './AppLayout';
import { customPages } from './entities';

/** Component gallery: development only (dropped from production builds). */
const UiGalleryPage = import.meta.env.DEV ? lazy(() => import('../pages/UiGalleryPage')) : null;

/**
 * Routes. Entity pages are generic: /:entityPath is any entity registered in app/entities.ts.
 * Custom pages (also in app/entities.ts) are matched first.
 */
export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        {customPages.map((p) => <Route key={p.path} path={p.path} element={<p.component />} />)}
        {UiGalleryPage && <Route path="ui-gallery" element={<Suspense fallback={null}><UiGalleryPage /></Suspense>} />}

        <Route path=":entityPath" element={<EntityListPage />}>
          <Route path="new" element={<EntityFormDrawer mode="create" />} />
        </Route>
        <Route path=":entityPath/:id" element={<EntityDetailPage />}>
          <Route path="edit" element={<EntityFormDrawer mode="edit" />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
