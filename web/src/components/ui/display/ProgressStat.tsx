import { Group, Progress, RingProgress, Stack, Text, type MantineColor } from '@mantine/core';

/**
 * Progress towards a target, as a ring or a bar.
 * <ProgressStat label="Completed" value={18} max={25} variant="ring" />
 */
export function ProgressStat({ label, value, max = 100, variant = 'bar', color = 'indigo', description }: {
  label: string;
  value: number;
  max?: number;
  variant?: 'bar' | 'ring';
  color?: MantineColor;
  description?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  if (variant === 'ring')
    return (
      <Group gap="md" wrap="nowrap">
        <RingProgress size={84} thickness={8} roundCaps sections={[{ value: pct, color }]}
          label={<Text ta="center" fw={700} size="sm">{pct}%</Text>} />
        <div>
          <Text fw={600}>{label}</Text>
          <Text size="sm" c="dimmed">{value} of {max}</Text>
          {description && <Text size="xs" c="dimmed">{description}</Text>}
        </div>
      </Group>
    );

  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Text size="sm" fw={500}>{label}</Text>
        <Text size="sm" c="dimmed">{value} / {max} ({pct}%)</Text>
      </Group>
      <Progress value={pct} color={color} size="md" radius="xl" />
      {description && <Text size="xs" c="dimmed">{description}</Text>}
    </Stack>
  );
}
