import { useParams } from 'react-router-dom';
import { useEntities } from '../api/hooks';

/** The registered entity for the :entityPath route segment (undefined while loading or if unknown). */
export function useCurrentEntity() {
  const { entityPath, id } = useParams();
  const ctx = useEntities();
  return { ...ctx, entity: ctx.entities.find((e) => e.path === entityPath), id };
}
