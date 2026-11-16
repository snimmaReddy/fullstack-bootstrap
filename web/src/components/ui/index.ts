/**
 * The UI kit: generic, reusable components for building pages. One import for everything:
 *   import { Section, StatGroup, ChartCard, BarChart, useConfirm, notify } from '../components/ui';
 * See them live at /ui-gallery (development only).
 */

// Layout
export { Section } from './layout/Section';
export { SplitLayout } from './layout/SplitLayout';
export { TabsPanel, type TabItem } from './layout/TabsPanel';
export { Toolbar } from './layout/Toolbar';
export { PageHeader, type Crumb } from '../PageHeader';

// Data display
export { StatGroup, type StatItem } from './display/StatGroup';
export { KeyValueList, type KeyValue } from './display/KeyValueList';
export { CardGrid } from './display/CardGrid';
export { StatusBadge } from './display/StatusBadge';
export { Timeline, type TimelineItem } from './display/Timeline';
export { ProgressStat } from './display/ProgressStat';
export { AvatarText } from './display/AvatarText';
export { StatCard } from '../StatCard';
export { EntityTable } from '../EntityTable';
export { EmptyState, ErrorState } from '../StateViews';

// Charts
export { ChartCard } from './charts/ChartCard';
export { BarChart, DonutChart, LineChart, CHART_COLORS, type SeriesInput } from './charts/charts';

// Forms
export { SearchInput } from './forms/SearchInput';
export { FormSection } from './forms/FormSection';
export { DateRangeInput, type DateRange } from './forms/DateRangeInput';
export { FileDrop } from './forms/FileDrop';
export { Wizard, type WizardStep } from './forms/Wizard';
export { FieldInput, FieldValue, RefSelect } from '../../entity/fields';

// Feedback
export { ConfirmDelete, ConfirmDialog, ConfirmProvider, useConfirm, type ConfirmOptions } from './feedback/ConfirmDialog';
export { InlineAlert } from './feedback/InlineAlert';
export { notify } from './feedback/notify';
