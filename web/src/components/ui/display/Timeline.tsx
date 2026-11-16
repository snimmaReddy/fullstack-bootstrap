import { Text, Timeline as MantineTimeline, type MantineColor } from '@mantine/core';
import { IconPoint } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import type { IconComponent } from '../../../entity/types';

export interface TimelineItem {
  title: ReactNode;
  description?: ReactNode;
  time?: string | Date;
  icon?: IconComponent;
  color?: MantineColor;
}

/**
 * Dated activity/event list, newest first as given.
 * <Timeline items={[{ title: 'Created', time: record.createdAt }]} />
 */
export function Timeline({ items, active = -1 }: { items: TimelineItem[]; active?: number }) {
  return (
    <MantineTimeline active={active} bulletSize={24} lineWidth={2}>
      {items.map((item, i) => {
        const Icon = item.icon ?? IconPoint;
        return (
          <MantineTimeline.Item key={i} title={item.title} color={item.color} bullet={<Icon size={14} />}>
            {item.description && <Text size="sm" c="dimmed">{item.description}</Text>}
            {item.time && <Text size="xs" c="dimmed" mt={4}>{dayjs(item.time).format('D MMM YYYY, HH:mm')}</Text>}
          </MantineTimeline.Item>
        );
      })}
    </MantineTimeline>
  );
}
