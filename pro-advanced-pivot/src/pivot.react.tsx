import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DetailedHTMLProps,
  type HTMLAttributes,
} from 'react';
import { RevoGrid, type DataType } from '@revolist/react-datagrid';
import type { PivotConfig } from '@revolist/revogrid-enterprise';
import './financial-pivot-header/financial-pivot-header.scss';
import { currentTheme } from '../../composables/useRandomData';
import {
  FINANCIAL_COLUMNS,
  FINANCIAL_COLUMN_TYPES,
  FINANCIAL_MULTI_ROW_HEADER,
  FINANCIAL_SHOWCASE_PLUGINS,
  applyFinancialPivotOptions,
  createFinancialPreset,
  resolveFinancialRows,
  type FinancialPresetId,
} from './financial.pivot';
import {
  FINANCIAL_PIVOT_CONFIGURATOR_EVENT,
  FINANCIAL_PIVOT_EXPANDED_EVENT,
  FINANCIAL_PIVOT_PRESET_EVENT,
  defineFinancialPivotHeaderElement,
  type FinancialPivotHeaderElement,
  type FinancialPivotHeaderState,
} from './financial-pivot-header/financial-pivot-header';

defineFinancialPivotHeaderElement();

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'financial-pivot-header': DetailedHTMLProps<
        HTMLAttributes<FinancialPivotHeaderElement>,
        FinancialPivotHeaderElement
      >;
    }
  }
}

interface PivotProps {
  rows?: DataType[];
}

const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

function PivotShowcase({ rows }: PivotProps) {
  const { isDark } = currentTheme();
  const data = useMemo(() => resolveFinancialRows(rows), [rows]);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(() => createFinancialPreset());
  const [activePreset, setActivePreset] = useState<FinancialPresetId>('sales');
  const [configuratorVisible, setConfiguratorVisible] = useState(() => !isSmallScreen());
  const [expanded, setExpanded] = useState(false);

  const pivot = useMemo(
    () => applyFinancialPivotOptions(pivotConfig, data, configuratorVisible),
    [pivotConfig, data, configuratorVisible],
  );
  const plugins = useMemo(() => FINANCIAL_SHOWCASE_PLUGINS, []);
  const columns = useMemo(() => FINANCIAL_COLUMNS, []);
  const columnTypes = useMemo(() => FINANCIAL_COLUMN_TYPES, []);
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const headerRef = useRef<FinancialPivotHeaderElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const handler = (event: Event) => {
      const nextConfig = (event as CustomEvent<PivotConfig>).detail || createFinancialPreset();
      setPivotConfig(nextConfig);
    };
    grid.addEventListener('pivot-config-update', handler);
    return () => grid.removeEventListener('pivot-config-update', handler);
  }, []);

  const selectPreset = useCallback((id: FinancialPresetId) => {
    if (gridRef.current) gridRef.current.pivot = undefined;
    window.setTimeout(() => {
      setPivotConfig(createFinancialPreset(id));
      setActivePreset(id);
    });
  }, []);

  const headerState = useMemo<FinancialPivotHeaderState>(() => ({
    activePreset,
    configuratorVisible,
    expanded,
  }), [activePreset, configuratorVisible, expanded]);

  useEffect(() => {
    if (headerRef.current) headerRef.current.state = headerState;
  }, [headerState]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const onPreset = (event: Event) => {
      selectPreset((event as CustomEvent<FinancialPresetId>).detail);
    };
    const onConfigurator = () => setConfiguratorVisible((value) => !value);
    const onExpanded = () => setExpanded((value) => !value);
    header.addEventListener(FINANCIAL_PIVOT_PRESET_EVENT, onPreset);
    header.addEventListener(FINANCIAL_PIVOT_CONFIGURATOR_EVENT, onConfigurator);
    header.addEventListener(FINANCIAL_PIVOT_EXPANDED_EVENT, onExpanded);
    return () => {
      header.removeEventListener(FINANCIAL_PIVOT_PRESET_EVENT, onPreset);
      header.removeEventListener(FINANCIAL_PIVOT_CONFIGURATOR_EVENT, onConfigurator);
      header.removeEventListener(FINANCIAL_PIVOT_EXPANDED_EVENT, onExpanded);
    };
  }, [selectPreset]);

  return (
    <div
      className="financial-pivot-showcase grow flex flex-col gap-2 h-full p-2 box-border"
      style={expanded ? { position: 'fixed', inset: 8, zIndex: 1000, background: 'var(--financial-pivot-expanded-background)' } : undefined}
    >
      <financial-pivot-header ref={headerRef} />

      <div className="grow min-h-0 overflow-auto">
        <div className="pivot-grid-container h-full overflow-hidden" style={{ minWidth: configuratorVisible ? 920 : 680 }}>
          <RevoGrid
            ref={gridRef}
            className="overflow-hidden skip-style h-full min-h-0 cell-border"
            hideAttribution
            range
            resize
            filter
            multiRowHeader={FINANCIAL_MULTI_ROW_HEADER}
            colSize={180}
            source={data}
            columns={columns}
            pivot={pivot}
            theme={isDark() ? 'darkCompact' : 'compact'}
            plugins={plugins}
            columnTypes={columnTypes}
            readonly
          />
        </div>
      </div>
    </div>
  );
}

export default PivotShowcase;
