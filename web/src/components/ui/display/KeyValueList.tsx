import { DataList } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { ReactNode } from 'react';

export interface KeyValue {
  label: ReactNode;
  value: ReactNode;
}

/**
 * Label/value pairs: side by side on desktop, stacked on phones.
 * <KeyValueList items={[{ label: 'Status', value: <StatusBadge value="active" /> }]} />
 */
export function KeyValueList({ items, labelWidth = 180 }: { items: KeyValue[]; labelWidth?: number }) {
  const narrow = useMediaQuery('(max-width: 48em)');
  return (
    <DataList orientation={narrow ? 'vertical' : 'horizontal'} withDivider labelWidth={labelWidth}>
      {items.map((item, i) => (
        <DataList.Item key={i}>
          <DataList.ItemLabel>{item.label}</DataList.ItemLabel>
          <DataList.ItemValue>{item.value ?? '—'}</DataList.ItemValue>
        </DataList.Item>
      ))}
    </DataList>
  );
}
