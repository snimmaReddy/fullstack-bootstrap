import { Group, Skeleton, Table, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { DataRecord, SchemaField } from '../api/schemas';
import { FieldValue } from '../entity/fields';

/**
 * Table of records. Click a row to open it; click a header to sort (when onSort is given).
 * sort uses the API syntax: "name" (ascending) or "-name" (descending).
 */
export function EntityTable({ columns, rows, loading, sort, onSort, onRowClick, showCreated = true, skeletonRows = 5 }: {
  columns: SchemaField[];
  rows: DataRecord[];
  loading?: boolean;
  sort?: string;
  onSort?: (sort: string) => void;
  onRowClick?: (row: DataRecord) => void;
  showCreated?: boolean;
  skeletonRows?: number;
}) {
  const header = (key: string, label: string) => {
    if (!onSort) return <Table.Th key={key}>{label}</Table.Th>;
    const active = sort?.replace(/^-/, '') === key;
    const desc = active && sort!.startsWith('-');
    const Icon = !active ? IconSelector : desc ? IconChevronDown : IconChevronUp;
    return (
      <Table.Th key={key}>
        <UnstyledButton onClick={() => onSort(active && !desc ? `-${key}` : key)}>
          <Group gap={4} wrap="nowrap">
            <Text fw={600} size="sm">{label}</Text>
            <Icon size={14} stroke={1.5} opacity={active ? 1 : 0.5} />
          </Group>
        </UnstyledButton>
      </Table.Th>
    );
  };

  const colCount = columns.length + (showCreated ? 1 : 0);

  return (
    <Table.ScrollContainer minWidth={Math.max(600, colCount * 140)}>
      <Table highlightOnHover={!!onRowClick} verticalSpacing="sm" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            {columns.map((c) => header(c.name, c.label))}
            {showCreated && header('createdAt', 'Created')}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading && rows.length === 0
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <Table.Tr key={i}>
                  {Array.from({ length: colCount }, (_, j) => (
                    <Table.Td key={j}><Skeleton height={14} radius="sm" /></Table.Td>
                  ))}
                </Table.Tr>
              ))
            : rows.map((row) => (
                <Table.Tr key={row.id} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : undefined }}>
                  {columns.map((c) => (
                    <Table.Td key={c.name} maw={320} style={{ whiteSpace: c.type === 'text' ? undefined : 'nowrap' }}>
                      <FieldValue field={c} value={row[c.name]} />
                    </Table.Td>
                  ))}
                  {showCreated && (
                    <Table.Td c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {row.createdAt ? dayjs(row.createdAt).format('D MMM YYYY') : '—'}
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
