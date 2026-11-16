import { DatePickerInput } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';

/** [from, to] as "YYYY-MM-DD" strings (either may be null). */
export type DateRange = [string | null, string | null];

/**
 * From/to date picker.
 * <DateRangeInput label="Period" value={range} onChange={setRange} />
 * Filter a list with it: { 'createdAt.gte': range[0], 'createdAt.lte': range[1] }
 */
export function DateRangeInput({ value, onChange, label, placeholder = 'Pick a date range', clearable = true, w }: {
  value: DateRange;
  onChange: (value: DateRange) => void;
  label?: string;
  placeholder?: string;
  clearable?: boolean;
  w?: number | string;
}) {
  return (
    <DatePickerInput
      type="range"
      label={label}
      placeholder={placeholder}
      leftSection={<IconCalendar size={16} />}
      valueFormat="D MMM YYYY"
      clearable={clearable}
      value={value}
      onChange={(v) => onChange(v as DateRange)}
      w={w}
    />
  );
}
