import { notifications } from '@mantine/notifications';

/**
 * One-line toasts.
 * notify.success('Saved'); notify.error(err); notify.info('Export started', 'Heads up');
 */
export const notify = {
  success: (message: string, title?: string) => notifications.show({ color: 'teal', title, message }),
  info: (message: string, title?: string) => notifications.show({ color: 'indigo', title, message }),
  warning: (message: string, title?: string) => notifications.show({ color: 'yellow', title, message }),
  error: (error: unknown, title = 'Something went wrong') =>
    notifications.show({ color: 'red', title, message: error instanceof Error ? error.message : String(error) }),
};
