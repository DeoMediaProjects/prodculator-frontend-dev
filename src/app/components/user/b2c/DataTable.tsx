import { useMemo, useState, type ReactNode } from 'react';
import { Box, Typography, InputBase, IconButton, Tooltip } from '@mui/material';
import {
  ArrowUpward, ArrowDownward, FilterListOutlined, Close, InboxOutlined,
  ChevronLeft, ChevronRight,
} from '@mui/icons-material';
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
  emptyMessage?: ReactNode;
  /** Icon shown above emptyMessage when there are no rows at all (not just a filtered-to-zero result). */
  emptyIcon?: ReactNode;
  minWidth?: number;
  /** Keep the column headers visible with no rows, so the shape of the table
   *  is still legible before any data arrives. */
  showHeaderWhenEmpty?: boolean;
  /** Heading rendered inside the table's own card. Callers used to place a
   *  heading above the table, which left the title visually detached from the
   *  thing it names; wrapping the table to fix that would nest one card inside
   *  another. */
  title?: ReactNode;
  /** Control rendered opposite the title, e.g. a scope filter. */
  headerAction?: ReactNode;
  /** Rows per page. Omitted, every row renders and no footer appears. */
  pageSize?: number;
  /** Singular noun for the pagination count ("report" -> "1 of 4 reports"). */
  itemNoun?: string;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T>({
  columns, rows, getRowId, onRowClick, rowActions, actionsHeader = 'ACTIONS',
  maxHeight = 480, emptyMessage = 'Nothing to show.', emptyIcon, minWidth = 720,
  showHeaderWhenEmpty = false, title, headerAction, pageSize, itemNoun = 'row',
}: Props<T>) {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

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

  // Filtering can shrink the result set below the current page, which would
  // render an empty table under a "showing 0 of 3" footer. Clamped during
  // render rather than corrected in an effect: an effect would paint the empty
  // page first, then re-render, so the user sees the flash of nothing.
  const pageCount = pageSize ? Math.max(1, Math.ceil(processed.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);

  const visible = useMemo(() => {
    if (!pageSize) return processed;
    const start = safePage * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, safePage, pageSize]);

  const hasActions = Boolean(rowActions);
  const template = [...columns.map((c) => c.width || '1fr'), ...(hasActions ? ['0.9fr'] : [])].join(' ');
  const anyFilterable = columns.some((c) => c.filterable !== false);
  const activeFilterCount = Object.values(filters).filter((v) => v.trim()).length;
  // No rows at all (not just filtered to zero) — the filter/sort chrome implies
  // functionality that doesn't apply yet, so show a plain empty state instead.
  const isEmpty = rows.length === 0;

  // One grid definition shared by the header, the filter row and the body, so
  // the three always line up. The column gap is what separates the tracks:
  // per-cell right padding cannot do it, because a right-aligned cell's padding
  // insets its own text but does nothing about the neighbour's text starting at
  // its own left edge, which is how two headers came to read as one word.
  const gridSx = { display: 'grid', gridTemplateColumns: template, columnGap: 2.5 } as const;

  const cellSx = (align?: 'left' | 'right') => ({
    // minWidth: 0 lets the grid item shrink to its track so nowrap text ellipsizes
    // instead of overflowing into the neighbouring column.
    minWidth: 0, fontSize: 14, color: t.textPrimary, textAlign: align || 'left',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  });

  return (
    <Box sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      {/* Title bar. Shares a row with the scope control and the filter toggle so
          the table has one header rather than a stack of separate strips. */}
      {(title || headerAction) && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 2, px: 2.5, pt: 2.25, pb: anyFilterable && !isEmpty ? 0.5 : 2.25,
        }}>
          {typeof title === 'string'
            ? <Typography sx={{ fontWeight: 800, fontSize: 18, color: t.textPrimary }}>{title}</Typography>
            : title}
          {headerAction}
        </Box>
      )}

      {/* Filter toggle bar. Unfiltered it collapses to a slim right-aligned
          control strip: the count only says something once filtering has
          narrowed the set, since unfiltered it reads "5 of 5", which just
          restates the rows below it. */}
      {anyFilterable && !isEmpty && (
        <Box sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: activeFilterCount ? 'space-between' : 'flex-end',
          px: 2.5, py: activeFilterCount ? 1 : 0.25,
          borderBottom: activeFilterCount || showFilters ? `1px solid ${t.borderSoft}` : 'none',
        }}>
          {activeFilterCount > 0 && (
            <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>
              {`${processed.length} of ${rows.length} · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
            </Typography>
          )}
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
          {/* Header — hidden when there's nothing to sort or filter yet, unless
              the caller wants the table's shape to stay legible while empty. */}
          {(!isEmpty || showHeaderWhenEmpty) && (
            <Box sx={{ ...gridSx, px: 2.5, py: 1.5, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 2, bgcolor: t.cardBg }}>
              {columns.map((col) => {
                const sorted = sortKey === col.key;
                return (
                  <Box
                    key={col.key}
                    onClick={() => toggleSort(col)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start', cursor: col.sortable === false ? 'default' : 'pointer', userSelect: 'none' }}
                  >
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: sorted ? t.gold : t.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.header}</Typography>
                    {sorted && (sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 13, color: t.gold }} /> : <ArrowDownward sx={{ fontSize: 13, color: t.gold }} />)}
                  </Box>
                );
              })}
              {hasActions && <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: t.textSecondary, whiteSpace: 'nowrap' }}>{actionsHeader}</Typography>}
            </Box>
          )}

          {/* Filter row */}
          {anyFilterable && showFilters && !isEmpty && (
            <Box sx={{ ...gridSx, px: 2.5, py: 1, borderBottom: `1px solid ${t.borderSoft}`, position: 'sticky', top: 41, zIndex: 1, bgcolor: t.cardBg }}>
              {columns.map((col) => (
                <Box key={col.key} sx={{ minWidth: 0 }}>
                  {col.filterable !== false ? (
                    <InputBase
                      value={filters[col.key] || ''}
                      onChange={(e) => setFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                      placeholder="Filter"
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
            <Box sx={{ px: 2.5, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              {isEmpty && (emptyIcon ?? <InboxOutlined sx={{ fontSize: 28, color: t.textFaint }} />)}
              {typeof emptyMessage === 'string'
                ? <Typography sx={{ color: t.textSecondary }}>{emptyMessage}</Typography>
                : emptyMessage}
            </Box>
          ) : visible.map((row) => {
            const id = getRowId(row);
            return (
              <Box
                key={id}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
                sx={{ ...gridSx, alignItems: 'center', px: 2.5, py: 1.75, borderBottom: `1px solid ${t.borderSoft}`, cursor: onRowClick ? 'pointer' : 'default', '&:hover': { bgcolor: onRowClick ? t.goldDim : 'transparent' } }}
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

      {/* Pagination. Rendered whenever a pageSize is set, including on a single
          page: the count is the useful half of this control, and having the
          footer appear only once a table spills over makes the card change
          height for what looks to the user like no reason. */}
      {pageSize && !isEmpty && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
          px: 2.5, py: 1.25, borderTop: `1px solid ${t.borderSoft}`,
        }}>
          <IconButton
            size="small"
            aria-label="Previous page"
            disabled={safePage === 0}
            onClick={() => setPage(Math.max(0, safePage - 1))}
            sx={{ color: t.textSecondary, '&.Mui-disabled': { color: t.textFaint } }}
          >
            <ChevronLeft sx={{ fontSize: 19 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary, minWidth: 0 }}>
            {`Showing ${visible.length} of ${processed.length} ${itemNoun}${processed.length === 1 ? '' : 's'}`}
          </Typography>
          <IconButton
            size="small"
            aria-label="Next page"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
            sx={{ color: t.textSecondary, '&.Mui-disabled': { color: t.textFaint } }}
          >
            <ChevronRight sx={{ fontSize: 19 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
