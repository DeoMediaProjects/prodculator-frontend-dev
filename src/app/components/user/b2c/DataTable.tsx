import { useMemo, useState, type ReactNode } from 'react';
import { Box, Typography, InputBase, IconButton, Tooltip } from '@mui/material';
import { ArrowUpward, ArrowDownward, FilterListOutlined, Close } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Defaults to the raw sortValue. */
  render?: (row: T) => ReactNode;
  /** Sort/filter value. Defaults to (row as any)[key]. */
  sortValue?: (row: T) => string | number;
  width?: string; // CSS grid fraction, e.g. '2fr' | '120px'
  align?: 'left' | 'right';
  sortable?: boolean;   // default true
  filterable?: boolean; // default true
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  actionsHeader?: string;
  maxHeight?: number;
  emptyMessage?: string;
  minWidth?: number;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T>({
  columns, rows, getRowId, onRowClick, rowActions, actionsHeader = 'ACTIONS',
  maxHeight = 480, emptyMessage = 'Nothing to show.', minWidth = 720,
}: Props<T>) {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const valueOf = (row: T, col: Column<T>): string | number =>
    col.sortValue ? col.sortValue(row) : ((row as Record<string, unknown>)[col.key] as string | number) ?? '';

  const processed = useMemo(() => {
    let out = rows;
    // Per-column contains filter (case-insensitive).
    const active = Object.entries(filters).filter(([, v]) => v.trim());
    if (active.length) {
      out = out.filter((row) =>
        active.every(([key, q]) => {
          const col = columns.find((c) => c.key === key);
          if (!col) return true;
          return String(valueOf(row, col)).toLowerCase().includes(q.trim().toLowerCase());
        }),
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        out = [...out].sort((a, b) => {
          const va = valueOf(a, col); const vb = valueOf(b, col);
          const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, filters, sortKey, sortDir, columns]);

  const toggleSort = (col: Column<T>) => {
    if (col.sortable === false) return;
    if (sortKey !== col.key) { setSortKey(col.key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir('asc'); }
  };

  const hasActions = Boolean(rowActions);
  const template = [...columns.map((c) => c.width || '1fr'), ...(hasActions ? ['0.9fr'] : [])].join(' ');
  const anyFilterable = columns.some((c) => c.filterable !== false);
  const activeFilterCount = Object.values(filters).filter((v) => v.trim()).length;

  const cellSx = (align?: 'left' | 'right') => ({
    // minWidth: 0 lets the grid item shrink to its track so nowrap text ellipsizes
    // instead of overflowing into the neighbouring column.
    minWidth: 0, fontSize: 14, color: t.textPrimary, textAlign: align || 'left',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1.5,
  });

  return (
    <Box sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      {/* Filter toggle bar */}
      {anyFilterable && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1, borderBottom: `1px solid ${t.borderSoft}` }}>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>
            {processed.length} of {rows.length}{activeFilterCount ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {activeFilterCount > 0 && (
              <Tooltip title="Clear filters"><IconButton size="small" onClick={() => setFilters({})} sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}><Close sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            )}
            <Tooltip title={showFilters ? 'Hide filters' : 'Filter columns'}>
              <IconButton size="small" onClick={() => setShowFilters((s) => !s)} sx={{ color: showFilters || activeFilterCount ? t.gold : t.textSecondary }}>
                <FilterListOutlined sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      <Box sx={{ overflowX: 'auto', maxHeight, overflowY: 'auto' }}>
        <Box sx={{ minWidth }}>
          {/* Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: template, px: 2.5, py: 1.5, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 2, bgcolor: t.cardBg }}>
            {columns.map((col) => {
              const sorted = sortKey === col.key;
              return (
                <Box
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start', cursor: col.sortable === false ? 'default' : 'pointer', userSelect: 'none' }}
                >
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: sorted ? t.gold : t.textSecondary }}>{col.header}</Typography>
                  {sorted && (sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 13, color: t.gold }} /> : <ArrowDownward sx={{ fontSize: 13, color: t.gold }} />)}
                </Box>
              );
            })}
            {hasActions && <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: t.textSecondary }}>{actionsHeader}</Typography>}
          </Box>

          {/* Filter row */}
          {anyFilterable && showFilters && (
            <Box sx={{ display: 'grid', gridTemplateColumns: template, px: 2.5, py: 1, borderBottom: `1px solid ${t.borderSoft}`, position: 'sticky', top: 41, zIndex: 1, bgcolor: t.cardBg }}>
              {columns.map((col) => (
                <Box key={col.key} sx={{ pr: 1 }}>
                  {col.filterable !== false ? (
                    <InputBase
                      value={filters[col.key] || ''}
                      onChange={(e) => setFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                      placeholder="Filter…"
                      sx={{ width: '100%', fontSize: 12.5, color: t.textPrimary, bgcolor: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '8px', px: 1, py: 0.25, '& input::placeholder': { color: t.textFaint, opacity: 1 } }}
                    />
                  ) : null}
                </Box>
              ))}
              {hasActions && <Box />}
            </Box>
          )}

          {/* Rows */}
          {processed.length === 0 ? (
            <Box sx={{ px: 2.5, py: 5, textAlign: 'center' }}>
              <Typography sx={{ color: t.textSecondary }}>{emptyMessage}</Typography>
            </Box>
          ) : processed.map((row) => {
            const id = getRowId(row);
            return (
              <Box
                key={id}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
                sx={{ display: 'grid', gridTemplateColumns: template, alignItems: 'center', px: 2.5, py: 1.75, borderBottom: `1px solid ${t.borderSoft}`, cursor: onRowClick ? 'pointer' : 'default', '&:hover': { bgcolor: onRowClick ? t.goldDim : 'transparent' } }}
              >
                {columns.map((col) => (
                  <Box key={col.key} sx={cellSx(col.align)}>
                    {col.render ? col.render(row) : String(valueOf(row, col))}
                  </Box>
                ))}
                {hasActions && (
                  <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
                    {rowActions!(row)}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
