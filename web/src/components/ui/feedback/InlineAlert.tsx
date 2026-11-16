import { Alert } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconCircleX, IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';

const KINDS = {
  info: { color: 'indigo', Icon: IconInfoCircle },
  success: { color: 'teal', Icon: IconCircleCheck },
  warning: { color: 'yellow', Icon: IconAlertTriangle },
  error: { color: 'red', Icon: IconCircleX },
} as const;

/**
 * Message box inside a page or form.
 * <InlineAlert type="warning" title="Heads up">This can't be undone.</InlineAlert>
 */
export function InlineAlert({ type = 'info', title, children, onClose }: {
  type?: keyof typeof KINDS;
  title?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
}) {
  const { color, Icon } = KINDS[type];
  return (
    <Alert color={color} variant="light" title={title} icon={<Icon size={18} />} withCloseButton={!!onClose} onClose={onClose}>
      {children}
    </Alert>
  );
}
