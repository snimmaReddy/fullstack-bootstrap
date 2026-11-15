import type { ResourceConfig } from '../types';

/**
 * Hand-written resources backed by a typed C# CrudController<T>.
 * Schema-driven resources (schemas/*.json) are loaded from /api/schemas automatically.
 */
export const resources: ResourceConfig[] = [];
