import { Card, Group, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * A titled card: the basic building block of a page.
 * <Section title="Recent activity" description="Last 7 days" actions={<Button>View all</Button>}>…</Section>
 */
export function Section({ title, description, actions, footer, children, flush }: {
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons or links shown at the top right. */
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /** Remove the inner padding (for full-width tables). */
  flush?: boolean;
}) {
  const hasHeader = title || description || actions;
  return (
    <Card padding={0}>
      {hasHeader && (
        <Group justify="space-between" align="flex-start" p="md" pb={flush ? 'md' : 0} wrap="wrap" gap="sm">
          <div>
            {title && <Title order={4}>{title}</Title>}
            {description && <Text size="sm" c="dimmed" mt={2}>{description}</Text>}
          </div>
          {actions && <Group gap="xs">{actions}</Group>}
        </Group>
      )}
      <div style={{ padding: flush ? 0 : 'var(--mantine-spacing-md)' }}>{children}</div>
      {footer && (
        <div style={{ padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)', borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          {footer}
        </div>
      )}
    </Card>
  );
}
