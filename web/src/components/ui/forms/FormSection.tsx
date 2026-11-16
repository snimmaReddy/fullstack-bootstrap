import { Divider, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * Groups related fields under a heading inside a form.
 * <FormSection title="Contact details" description="How we reach you">…inputs…</FormSection>
 */
export function FormSection({ title, description, children, divider = true }: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <Stack gap="sm">
      {divider && <Divider />}
      <div>
        <Text fw={600}>{title}</Text>
        {description && <Text size="sm" c="dimmed">{description}</Text>}
      </div>
      <Stack gap="md">{children}</Stack>
    </Stack>
  );
}
