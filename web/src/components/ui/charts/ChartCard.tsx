import { Center, Skeleton, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Section } from '../layout/Section';

/**
 * A titled card around a chart, with loading and empty states.
 * <ChartCard title="Per month" loading={q.isLoading} empty={!rows.length}><BarChart … /></ChartCard>
 */
export function ChartCard({ title, description, actions, loading, empty, height = 260, children }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  height?: number;
  children: ReactNode;
}) {
  return (
    <Section title={title} description={description} actions={actions}>
      {loading ? <Skeleton height={height} />
        : empty ? <Center h={height}><Text c="dimmed" size="sm">No data to show yet.</Text></Center>
        : children}
    </Section>
  );
}
