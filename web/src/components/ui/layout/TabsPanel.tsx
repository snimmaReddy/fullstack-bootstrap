import { Tabs } from '@mantine/core';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IconComponent } from '../../../entity/types';

export interface TabItem {
  value: string;
  label: string;
  icon?: IconComponent;
  content: ReactNode;
}

/**
 * Tabs whose active tab is kept in the URL (?tab=…), so refresh and links keep it.
 * <TabsPanel tabs={[{ value: 'overview', label: 'Overview', content: <Overview /> }, …]} />
 */
export function TabsPanel({ tabs, param = 'tab' }: { tabs: TabItem[]; param?: string }) {
  const [params, setParams] = useSearchParams();
  const active = tabs.some((t) => t.value === params.get(param)) ? params.get(param)! : tabs[0]?.value;

  return (
    <Tabs
      value={active}
      onChange={(v) => setParams((p) => { const n = new URLSearchParams(p); n.set(param, v ?? ''); return n; }, { replace: true })}
      keepMounted={false}
    >
      <Tabs.List mb="md">
        {tabs.map((t) => (
          <Tabs.Tab key={t.value} value={t.value} leftSection={t.icon && <t.icon size={16} />}>{t.label}</Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map((t) => <Tabs.Panel key={t.value} value={t.value}>{t.content}</Tabs.Panel>)}
    </Tabs>
  );
}
