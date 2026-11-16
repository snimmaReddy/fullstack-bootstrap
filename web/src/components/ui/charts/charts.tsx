/**
 * Chart presets over Mantine Charts (Recharts) with the app's colours and sensible defaults.
 * Data is an array of rows; `series` lists the numeric keys to plot.
 *
 * <BarChart data={[{ month: 'Jan', open: 4, closed: 2 }]} dataKey="month" series={['open', 'closed']} />
 */
import {
  BarChart as MantineBarChart,
  DonutChart as MantineDonutChart,
  LineChart as MantineLineChart,
} from '@mantine/charts';

/** Colours assigned to series in order (any Mantine colour works). */
export const CHART_COLORS = ['indigo.6', 'teal.6', 'orange.6', 'grape.6', 'cyan.6', 'pink.6', 'lime.7', 'yellow.6'];

export type SeriesInput = string | { name: string; label?: string; color?: string };

const toSeries = (series: SeriesInput[]) =>
  series.map((s, i) => (typeof s === 'string' ? { name: s, color: CHART_COLORS[i % CHART_COLORS.length] }
    : { ...s, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }));

interface XYChartProps {
  data: Record<string, unknown>[];
  /** The x-axis key, e.g. "month". */
  dataKey: string;
  series: SeriesInput[];
  height?: number;
  /** Format numbers on the y-axis and tooltip. */
  valueFormatter?: (value: number) => string;
}

export function LineChart({ data, dataKey, series, height = 260, valueFormatter }: XYChartProps) {
  return (
    <MantineLineChart h={height} data={data} dataKey={dataKey} series={toSeries(series)} curveType="monotone"
      gridAxis="y" tickLine="none" withLegend={series.length > 1} valueFormatter={valueFormatter} />
  );
}

export function BarChart({ data, dataKey, series, height = 260, valueFormatter, stacked }: XYChartProps & { stacked?: boolean }) {
  return (
    <MantineBarChart h={height} data={data} dataKey={dataKey} series={toSeries(series)} type={stacked ? 'stacked' : 'default'}
      gridAxis="y" tickLine="none" withLegend={series.length > 1} valueFormatter={valueFormatter} />
  );
}

/** Parts of a whole: [{ name: 'A', value: 10 }, …]. */
export function DonutChart({ data, size = 180, label }: {
  data: { name: string; value: number; color?: string }[];
  size?: number;
  /** Text in the middle, e.g. a total. */
  label?: string;
}) {
  const cells = data.map((d, i) => ({ ...d, color: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }));
  return (
    <MantineDonutChart data={cells} size={size} thickness={24} withTooltip withLabelsLine={false}
      withLegend={cells.length > 1} chartLabel={label} tooltipDataSource="segment" mx="auto" />
  );
}
