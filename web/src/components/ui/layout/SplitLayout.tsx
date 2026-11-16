import { Grid, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * Main content with a side column; stacks on small screens.
 * <SplitLayout main={<Details />} side={<Activity />} />
 */
export function SplitLayout({ main, side, sideWidth = 4, sideFirst = false }: {
  main: ReactNode;
  side: ReactNode;
  /** Side column width out of 12 on desktop (default 4). */
  sideWidth?: number;
  /** Show the side column on the left. */
  sideFirst?: boolean;
}) {
  return (
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, md: 12 - sideWidth }} order={{ base: 1, md: sideFirst ? 2 : 1 }}>
        <Stack gap="lg">{main}</Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: sideWidth }} order={{ base: 2, md: sideFirst ? 1 : 2 }}>
        <Stack gap="lg">{side}</Stack>
      </Grid.Col>
    </Grid>
  );
}
