import { IconAddressBook, IconBox } from '@tabler/icons-react';
import type { CustomPage, EntityConfig } from '../entity/types';

/**
 * UI pages, one line per entity. Each entry gets a sidebar link plus list, detail,
 * create and edit pages built from its schema (schemas/<schema>.json).
 *
 * Only `schema` is required. Optional: path, endpoint, title, icon, columns,
 * filters, defaultSort, pageSize (see EntityConfig in entity/types.ts).
 */
export const entities: EntityConfig[] = [
  { schema: 'product', icon: IconBox },
  { schema: 'contact', icon: IconAddressBook },
];

/**
 * Custom pages in the sidebar. Create a component in pages/ and add one line, e.g.
 *   { path: 'reports', label: 'Reports', icon: IconChartBar, component: ReportsPage }
 */
export const customPages: CustomPage[] = [];
