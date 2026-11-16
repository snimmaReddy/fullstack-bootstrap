import { Card, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { IconComponent } from '../../../entity/types';

export interface StatItem {
  label: string;
  value: ReactNode;
  /** Change in percent; shown as ▲/▼ with colour. */
  change?: number;
  /** Small text under the value, e.g. "vs last month". */
  hint?: string;
  icon?: IconComponent;
  /** Set false when a decrease is good (e.g. errors). Default true. */
  higherIsBetter?: boolean;
}

/**
 * A row of metrics.
 * <StatGroup items={[{ label: 'Open', value: 42, change: 12, hint: 'vs last week' }]} />
 */
export function StatGroup({ items, cols = { base: 1, xs: 2, md: 4 } }: {
  items: StatItem[];
  cols?: number | Record<string, number>;
}) {
  return (
    <SimpleGrid cols={cols} spacing="lg">
      {items.map((s) => {
        const up = (s.change ?? 0) >= 0;
        const good = up === (s.higherIsBetter ?? true);
        const Arrow = up ? IconArrowUpRight : IconArrowDownRight;
        return (
          <Card key={s.label} padding="lg">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Text size="sm" c="dimmed" fw={500}>{s.label}</Text>
              {s.icon && <ThemeIcon variant="light" size={32}><s.icon size={18} /></ThemeIcon>}
            </Group>
            <Group gap="xs" align="flex-end" mt={6}>
              <Text fz={28} fw={700} lh={1}>{s.value}</Text>
              {s.change !== undefined && (
                <Text c={good ? 'teal' : 'red'} size="sm" fw={600} style={{ display: 'flex', alignItems: 'center' }}>
                  <Arrow size={16} stroke={2} />{Math.abs(s.change)}%
                </Text>
              )}
            </Group>
            {s.hint && <Text size="xs" c="dimmed" mt={6}>{s.hint}</Text>}
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
