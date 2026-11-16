import { Group } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * A row of controls (search, filters, buttons) that wraps cleanly on small screens.
 * <Toolbar left={<SearchInput … />} right={<Button>Export</Button>} />
 */
export function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <Group justify="space-between" gap="sm" wrap="wrap">
      <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>{left}</Group>
      {right && <Group gap="sm" wrap="wrap">{right}</Group>}
    </Group>
  );
}
