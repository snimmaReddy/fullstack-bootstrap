import { Badge, type MantineColor } from '@mantine/core';

/**
 * A badge coloured by its value.
 * <StatusBadge value={row.status} colors={{ active: 'teal', paused: 'yellow', closed: 'gray' }} />
 */
export function StatusBadge({ value, colors = {}, fallback = 'gray', variant = 'light' }: {
  value: string | null | undefined;
  colors?: Record<string, MantineColor>;
  fallback?: MantineColor;
  variant?: 'light' | 'filled' | 'outline' | 'dot';
}) {
  if (!value) return null;
  return <Badge variant={variant} color={colors[value] ?? fallback}>{value}</Badge>;
}
