import { Anchor, Breadcrumbs, Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

/** Page title with optional breadcrumbs, description and actions (buttons) on the right. */
export function PageHeader({ title, description, crumbs, actions }: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <Stack gap={6} mb="lg">
      {crumbs && crumbs.length > 0 && (
        <Breadcrumbs separatorMargin={6}>
          {crumbs.map((c) =>
            c.to ? (
              <Anchor key={c.label} component={Link} to={c.to} size="sm" c="dimmed">{c.label}</Anchor>
            ) : (
              <Text key={c.label} size="sm" c="dimmed">{c.label}</Text>
            ),
          )}
        </Breadcrumbs>
      )}
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <div>
          <Title order={2}>{title}</Title>
          {description && <Text c="dimmed" size="sm" mt={4}>{description}</Text>}
        </div>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>
    </Stack>
  );
}
