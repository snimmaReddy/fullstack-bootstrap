import { CloseButton, TextInput, type TextInputProps } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

/**
 * Search box with a clear button. onChange fires after typing pauses (default 300 ms).
 * <SearchInput value={q} onChange={setQ} placeholder="Search…" />
 */
export function SearchInput({ value, onChange, delay = 300, ...props }: {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
} & Omit<TextInputProps, 'value' | 'onChange'>) {
  const [text, setText] = useState(value);
  const emit = useDebouncedCallback(onChange, delay);

  useEffect(() => setText(value), [value]); // follow outside changes (e.g. "Clear filters")

  const set = (v: string, immediate = false) => {
    setText(v);
    if (immediate) onChange(v);
    else emit(v);
  };

  return (
    <TextInput
      placeholder="Search…"
      leftSection={<IconSearch size={16} />}
      rightSection={text ? <CloseButton size="sm" aria-label="Clear search" onClick={() => set('', true)} /> : null}
      {...props}
      value={text}
      onChange={(e) => set(e.currentTarget.value)}
    />
  );
}
