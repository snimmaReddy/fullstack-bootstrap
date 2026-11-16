import { Alert, Button, Group, Modal, Text, type MantineColor } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: MantineColor;
  /**
   * Optional work to run on confirm. While it runs the button shows a spinner; if it throws,
   * the error is shown in the dialog and it stays open.
   */
  onConfirm?: () => Promise<void> | void;
}

/**
 * "Are you sure?" dialog (controlled). For most cases use useConfirm() instead.
 */
export function ConfirmDialog({ opened, onClose, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', color, onConfirm }:
  ConfirmOptions & { opened: boolean; onClose: (confirmed: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = (confirmed: boolean) => { setError(null); onClose(confirmed); };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm?.();
      close(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={opened} onClose={() => close(false)} title={<Text fw={600}>{title}</Text>} centered>
      {message && <Text size="sm" c="dimmed">{message}</Text>}
      {error && <Alert mt="md" color="red" variant="light" icon={<IconAlertTriangle size={18} />}>{error}</Alert>}
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={() => close(false)}>{cancelLabel}</Button>
        <Button color={color} loading={busy} onClick={confirm}>{confirmLabel}</Button>
      </Group>
    </Modal>
  );
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Put once near the root (done in main.tsx) so any component can call useConfirm(). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(confirmed: boolean) => void>(undefined);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOptions(o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <ConfirmDialog {...options} opened onClose={(ok) => { setOptions(null); resolver.current?.(ok); }} />
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * const confirm = useConfirm();
 * if (await confirm({ title: 'Archive 3 items?', confirmLabel: 'Archive' })) { … }
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm needs <ConfirmProvider> (see main.tsx).');
  return confirm;
}

/** Preset: delete confirmation. onConfirm errors (e.g. a 409 from the API) are shown in the dialog. */
export function ConfirmDelete({ opened, onClose, name, onConfirm }: {
  opened: boolean;
  onClose: () => void;
  name: string;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmDialog
      opened={opened}
      onClose={onClose}
      title={`Delete “${name}”?`}
      message="This permanently removes the record. It can't be undone."
      confirmLabel="Delete"
      color="red"
      onConfirm={onConfirm}
    />
  );
}
