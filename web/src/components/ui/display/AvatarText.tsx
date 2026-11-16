import { Avatar, Group, Text } from '@mantine/core';

/**
 * Avatar (image or initials) with a name and a secondary line.
 * <AvatarText name="Ada Lovelace" description="ada@example.com" />
 */
export function AvatarText({ name, description, src, size = 'md' }: {
  name: string;
  description?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Avatar src={src} name={name} color="initials" size={size} radius="xl" />
      <div style={{ minWidth: 0 }}>
        <Text size="sm" fw={500} truncate>{name}</Text>
        {description && <Text size="xs" c="dimmed" truncate>{description}</Text>}
      </div>
    </Group>
  );
}
