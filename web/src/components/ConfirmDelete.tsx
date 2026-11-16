import { Alert, Button, Group, Modal, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';

/**
 * Confirmation dialog for deleting a record. If onConfirm throws (e.g. the API refuses with 409
 * because other records link to it), the message is shown here and the dialog stays open.
 */
export function ConfirmDelete({ opened, onClose, name, onConfirm }: {
  opened: boolean;
  onClose: () => void;
  name: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={<Text fw={600}>Delete “{name}”?</Text>} centered>
      <Text size="sm" c="dimmed">This permanently removes the record. It can't be undone.</Text>
      {error && (
        <Alert mt="md" color="red" variant="light" icon={<IconAlertTriangle size={18} />}>{error}</Alert>
      )}
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={close}>Cancel</Button>
        <Button color="red" loading={busy} onClick={confirm}>Delete</Button>
      </Group>
    </Modal>
  );
}
