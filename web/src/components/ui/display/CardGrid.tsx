import { Card, SimpleGrid, Skeleton } from '@mantine/core';
import type { ReactNode } from 'react';
import { EmptyState } from '../../StateViews';

/**
 * Responsive grid of cards, one per item.
 * <CardGrid items={rows} render={(r) => <Text>{r.name}</Text>} onClick={(r) => navigate(r.id)} />
 */
export function CardGrid<T>({ items, render, getKey, onClick, loading, cols = { base: 1, sm: 2, lg: 3 }, emptyTitle = 'Nothing to show' }: {
  items: T[];
  render: (item: T) => ReactNode;
  getKey?: (item: T, index: number) => string | number;
  onClick?: (item: T) => void;
  loading?: boolean;
  cols?: number | Record<string, number>;
  emptyTitle?: string;
}) {
  if (loading && items.length === 0)
    return (
      <SimpleGrid cols={cols} spacing="lg">
        {[1, 2, 3].map((i) => <Card key={i} padding="lg"><Skeleton height={80} /></Card>)}
      </SimpleGrid>
    );
  if (items.length === 0) return <Card><EmptyState title={emptyTitle} /></Card>;

  return (
    <SimpleGrid cols={cols} spacing="lg">
      {items.map((item, i) => (
        <Card key={getKey?.(item, i) ?? i} padding="lg" onClick={() => onClick?.(item)}
          style={{ cursor: onClick ? 'pointer' : undefined }}>
          {render(item)}
        </Card>
      ))}
    </SimpleGrid>
  );
}
