import { Alert, Button, EmptyState as MantineEmptyState, Stack } from '@mantine/core';
import { IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/** Error message with an optional Retry button. */
export function ErrorState({ error, onRetry, title = 'Something went wrong' }: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <Alert color="red" variant="light" title={title} icon={<IconAlertTriangle size={18} />}>
      <Stack gap="sm" align="flex-start">
        {error instanceof Error ? error.message : String(error)}
        {onRetry && <Button size="xs" variant="white" color="red" onClick={onRetry}>Retry</Button>}
      </Stack>
    </Alert>
  );
}

/** Friendly placeholder for an empty list, with an optional action. */
export function EmptyState({ title, description, action }: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <MantineEmptyState
      py={48}
      title={title}
      description={description}
      icon={<IconInbox size={28} stroke={1.5} />}
    >
      {action}
    </MantineEmptyState>
  );
}
