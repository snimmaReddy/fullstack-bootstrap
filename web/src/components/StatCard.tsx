import { Card, Group, Skeleton, Text, ThemeIcon } from '@mantine/core';
import type { IconComponent } from '../entity/types';

/** A clickable summary card: icon, label and a number. */
export function StatCard({ label, value, icon: Icon, onClick, loading }: {
  label: string;
  value: number | string | undefined;
  icon: IconComponent;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <Card padding="lg" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="sm" c="dimmed" fw={500}>{label}</Text>
          {loading ? <Skeleton height={30} width={60} mt={6} /> : <Text fz={30} fw={700} lh={1.2} mt={4}>{value ?? '—'}</Text>}
        </div>
        <ThemeIcon variant="light" size={44} radius="md">
          <Icon size={24} stroke={1.5} />
        </ThemeIcon>
      </Group>
    </Card>
  );
}
