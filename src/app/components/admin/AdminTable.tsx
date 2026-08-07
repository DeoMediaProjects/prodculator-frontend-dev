import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { FilterAltOffOutlined, SearchOutlined } from '@mui/icons-material';
import { TabulatorFull as Tabulator, type ColumnDefinition, type Options } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { ADMIN_FONT_STACK, ADMIN_MONO_STACK } from './AdminThemeProvider';

export type AdminColumn = ColumnDefinition;

interface AdminTableProps<T> {
  rows: T[];
  columns: AdminColumn[];
  /** Stable row identity. Defaults to `id`, which every admin dataset carries. */
  idField?: string;
  loading?: boolean;
  /** Shown instead of the grid when there are no rows at all. */
  emptyTitle?: string;
  emptyBody?: string;
  /** Visible rows before the body scrolls. Height is derived, so it stays exact. */
  visibleRows?: number;
  rowHeight?: number;
  /** Free-text box above the grid, matched across every column. */
  searchPlaceholder?: string;
  /** Rendered to the right of the search box (Add, Import, Refresh...). */
  actions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Extra Tabulator options for a specific table. Merged last. */
  options?: Partial<Options>;
}

/**
 * The one table in the admin console.
 *
 * Every dataset screen previously hand-rolled a MUI Table with its own header
 * markup, its own sort (or none), and no filtering, so the same job looked
 * different on every screen and nothing was actually filterable. Tabulator
 * gives per-column header filters, sorting and a virtualised scroll body; this
 * wrapper supplies the parts that must not vary: the theme, the empty state,
 * the scroll container, and the vocabulary above the grid.
 *
 * Tabulator styles itself with global CSS, so its surfaces are re-pointed at the
 * theme tokens below rather than left on its default light palette. That is what
 * makes it work in both modes instead of only the one it was authored for.
 */
export function AdminTable<T extends Record<string, unknown>>({
  rows,
  columns,
  idField = 'id',
  loading = false,
  emptyTitle = 'Nothing here yet',
  emptyBody,
  visibleRows = 12,
  rowHeight = 40,
  searchPlaceholder = 'Search all columns...',
  actions,
  onRowClick,
  options,
}: AdminTableProps<T>) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const holder = useRef<HTMLDivElement | null>(null);
  const table = useRef<Tabulator | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState(0);

  // Header height plus the body, so exactly `visibleRows` are on screen and the
  // rest scroll rather than pushing the page down.
  const bodyHeight = useMemo(() => visibleRows * rowHeight + 46, [visibleRows, rowHeight]);

  // Columns get a header filter unless one is explicitly declined, which is the
  // whole point: a dataset screen you cannot filter is a screen you cannot use.
  const preparedColumns = useMemo<ColumnDefinition[]>(
    () => columns.map((c) => {
      // `false` is not a valid headerFilter in the typings, so an opted-out
      // column simply omits the key rather than setting it falsy.
      const wantsFilter = c.headerFilter !== undefined
        ? c.headerFilter
        : (c.formatter === 'html' ? undefined : 'input');
      const prepared: ColumnDefinition = { resizable: true, ...c };
      if (wantsFilter) {
        prepared.headerFilter = wantsFilter;
        prepared.headerFilterLiveFilter = true;
      }
      return prepared;
    }),
    [columns],
  );

  useEffect(() => {
    if (!holder.current) return;
    const instance = new Tabulator(holder.current, {
      data: rows,
      columns: preparedColumns,
      index: idField,
      layout: 'fitColumns',
      height: bodyHeight,
      placeholder: 'No rows match these filters.',
      reactiveData: false,
      // Virtual DOM keeps a few thousand rows responsive, which the incentive
      // and grant datasets already exceed.
      renderHorizontal: 'virtual',
      ...options,
    });
    table.current = instance;

    if (onRowClick) {
      instance.on('rowClick', (_e, row) => onRowClick(row.getData() as T));
    }
    instance.on('dataFiltered', (filters) => setActiveFilters(filters.length));

    return () => {
      instance.destroy();
      table.current = null;
    };
    // Rebuilt only when the shape changes, never on every data tick: replaceData
    // below handles updates without tearing down the grid and losing scroll,
    // sort and filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparedColumns, idField, bodyHeight]);

  // Data updates in place, so an admin's sort and filters survive a refresh.
  useEffect(() => {
    void table.current?.replaceData(rows);
  }, [rows]);

  useEffect(() => {
    const instance = table.current;
    if (!instance) return;
    const term = search.trim();
    if (!term) {
      instance.clearFilter(true);
      return;
    }
    // Matches the term against every column's rendered value, so one box does
    // what an admin expects without them choosing a field first.
    instance.setFilter((data: Record<string, unknown>) =>
      Object.values(data).some((v) =>
        v != null && String(v).toLowerCase().includes(term.toLowerCase()),
      ),
    );
  }, [search]);

  const clearAll = () => {
    setSearch('');
    table.current?.clearHeaderFilter();
    table.current?.clearFilter(true);
  };

  const showEmpty = !loading && rows.length === 0;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 1.5 }}
      >
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: { sm: 320 }, flex: 1 }}
          slotProps={{
            input: { startAdornment: <SearchOutlined sx={{ mr: 1, fontSize: 19, color: t.textSecondary }} /> },
          }}
        />
        {(search || activeFilters > 0) && (
          <Button size="small" startIcon={<FilterAltOffOutlined />} onClick={clearAll}>
            Clear filters
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {rows.length > 0 && (
          <Chip
            size="small"
            label={`${rows.length.toLocaleString()} row${rows.length === 1 ? '' : 's'}`}
            sx={{ bgcolor: t.borderSoft, color: t.textSecondary, fontWeight: 600 }}
          />
        )}
        {actions}
      </Stack>

      {showEmpty ? (
        <Box
          sx={{
            border: `1px solid ${t.border}`, borderRadius: '12px',
            py: 6, px: 3, textAlign: 'center', bgcolor: t.cardBgAlt,
          }}
        >
          <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 15, mb: 0.5 }}>
            {emptyTitle}
          </Typography>
          {emptyBody && (
            <Typography sx={{ color: t.textSecondary, fontSize: 13, maxWidth: 460, mx: 'auto' }}>
              {emptyBody}
            </Typography>
          )}
        </Box>
      ) : (
        <Box
          ref={holder}
          sx={{
            // Tabulator ships a light theme in global CSS. Re-point every
            // surface it paints at the tokens so both modes are correct.
            '& .tabulator': {
              background: 'transparent',
              border: `1px solid ${t.border}`,
              borderRadius: '12px',
              fontFamily: ADMIN_FONT_STACK,
              fontSize: '13px',
              fontVariantNumeric: 'tabular-nums',
            },
            '& .tabulator .tabulator-header': {
              background: t.cardBgAlt,
              borderBottom: `1px solid ${t.border}`,
              color: t.textSecondary,
              fontWeight: 700,
            },
            '& .tabulator .tabulator-header .tabulator-col': {
              background: 'transparent',
              borderRight: `1px solid ${t.borderSoft}`,
            },
            '& .tabulator .tabulator-header .tabulator-col-title': {
              fontSize: '11.5px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            },
            // Header filter inputs, styled as real form controls rather than
            // Tabulator's bare boxes.
            '& .tabulator .tabulator-header-filter input, & .tabulator .tabulator-header-filter select': {
              background: t.inputBg,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              color: t.textPrimary,
              padding: '4px 6px',
              fontSize: '12px',
              fontFamily: ADMIN_FONT_STACK,
              width: '100%',
              '&:focus': { outline: 'none', borderColor: t.gold },
            },
            '& .tabulator .tabulator-row': {
              background: 'transparent',
              borderBottom: `1px solid ${t.borderSoft}`,
              color: t.textPrimary,
              minHeight: `${rowHeight}px`,
            },
            '& .tabulator .tabulator-row.tabulator-row-even': { background: 'transparent' },
            '& .tabulator .tabulator-row:hover': { background: t.borderSoft },
            '& .tabulator .tabulator-row .tabulator-cell': {
              borderRight: 'none',
              padding: '9px 10px',
              display: 'flex',
              alignItems: 'center',
            },
            '& .tabulator .tabulator-row .tabulator-cell[tabulator-field="id"]': {
              fontFamily: ADMIN_MONO_STACK,
              fontSize: '11.5px',
              color: t.textFaint,
            },
            '& .tabulator .tabulator-footer': {
              background: t.cardBgAlt,
              borderTop: `1px solid ${t.border}`,
              color: t.textSecondary,
            },
            '& .tabulator .tabulator-footer .tabulator-page': {
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
              borderRadius: '6px',
              '&.active': { color: t.gold, borderColor: t.gold },
            },
            '& .tabulator .tabulator-placeholder': { color: t.textSecondary, background: 'transparent' },
            '& .tabulator .tabulator-tableholder': {
              // The scroll container. Thin native scrollbar tinted to the theme
              // rather than a bespoke scroll widget.
              scrollbarWidth: 'thin',
              scrollbarColor: `${t.border} transparent`,
            },
            '& .tabulator .tabulator-col-sorter .tabulator-arrow': { borderBottomColor: `${t.textSecondary} !important` },
            '& .tabulator .tabulator-col[aria-sort="ascending"] .tabulator-arrow, & .tabulator .tabulator-col[aria-sort="descending"] .tabulator-arrow': {
              borderBottomColor: `${t.gold} !important`,
            },
            ...(onRowClick ? { '& .tabulator .tabulator-row': { cursor: 'pointer' } } : {}),
          }}
        />
      )}
    </Box>
  );
}
