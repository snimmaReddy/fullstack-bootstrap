import { ActionIcon, Group, Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { useState } from 'react';

/**
 * Drag-and-drop file picker. It only selects files; uploading is up to the page.
 * <FileDrop value={files} onChange={setFiles} accept={['image/png', 'application/pdf']} maxSizeMb={5} />
 */
export function FileDrop({ value, onChange, accept, maxSizeMb = 10, multiple = true, label = 'Drag files here or click to choose' }: {
  value: File[];
  onChange: (files: File[]) => void;
  /** MIME types, e.g. ['image/*', 'application/pdf']. */
  accept?: string[];
  maxSizeMb?: number;
  multiple?: boolean;
  label?: string;
}) {
  const [rejected, setRejected] = useState<string | null>(null);

  return (
    <Stack gap="xs">
      <Dropzone
        onDrop={(files) => { setRejected(null); onChange(multiple ? [...value, ...files] : files.slice(0, 1)); }}
        onReject={(r) => setRejected(r.map((f) => `${f.file.name}: ${f.errors[0]?.message}`).join(' · '))}
        accept={accept}
        maxSize={maxSizeMb * 1024 * 1024}
        multiple={multiple}
      >
        <Group justify="center" gap="md" mih={110} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept><IconUpload size={36} stroke={1.5} color="var(--mantine-color-indigo-6)" /></Dropzone.Accept>
          <Dropzone.Reject><IconX size={36} stroke={1.5} color="var(--mantine-color-red-6)" /></Dropzone.Reject>
          <Dropzone.Idle><IconUpload size={36} stroke={1.5} color="var(--mantine-color-dimmed)" /></Dropzone.Idle>
          <div>
            <Text fw={500}>{label}</Text>
            <Text size="sm" c="dimmed">
              {accept?.length ? `${accept.join(', ')} · ` : ''}up to {maxSizeMb} MB{multiple ? ' each' : ''}
            </Text>
          </div>
        </Group>
      </Dropzone>
      {rejected && <Text size="sm" c="red">{rejected}</Text>}
      {value.map((f, i) => (
        <Group key={`${f.name}-${i}`} gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <IconFile size={16} />
            <Text size="sm" truncate>{f.name}</Text>
            <Text size="xs" c="dimmed">{(f.size / 1024).toFixed(0)} KB</Text>
          </Group>
          <ActionIcon variant="subtle" color="gray" aria-label={`Remove ${f.name}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <IconX size={14} />
          </ActionIcon>
        </Group>
      ))}
    </Stack>
  );
}
