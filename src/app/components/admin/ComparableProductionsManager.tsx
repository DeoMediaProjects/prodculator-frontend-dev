import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Edit, Add, Refresh, Delete, MovieFilterOutlined } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import { fetchTerritoryList } from '@/services/territory.service';
import type { ComparableProduction, TmdbSyncResponse } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

const genres = ['Action', 'Drama', 'Comedy', 'Sci Fi', 'Thriller', 'Horror', 'Adventure', 'Romance'];

export function ComparableProductionsManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canEditComparables')) {
    return (
      <AdminAccessDenied
        requiredPermission="Edit Comparable Productions"
        requiredRole="Master Admin, Senior Admin, or Data Admin"
      />
    );
  }

  return <ComparableProductionsManagerContent />;
}

function ComparableProductionsManagerContent() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  // Territories come from the same source the report engine ranks against,
  // rather than a hardcoded five that silently excluded most of the platform.
  const [territories, setTerritories] = useState<string[]>([]);
  const [productions, setProductions] = useState<ComparableProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<ComparableProduction | null>(null);
  const [formData, setFormData] = useState<Partial<ComparableProduction>>({});
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<TmdbSyncResponse | null>(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    (async () => {
      void fetchTerritoryList().then(({ data: tData }) => {
        if (tData?.territories?.length) {
          setTerritories(tData.territories.map((x) => x.label).sort((a, b) => a.localeCompare(b)));
        }
      });
      const { data, error } = await adminApi.getComparables();
      if (error) {
        setFetchError(error);
      } else {
        setProductions(data?.items ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const handleEdit = (production: ComparableProduction) => {
    setEditingProduction(production);
    setFormData(production);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingProduction(null);
    setFormData({});
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingProduction(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (editingProduction) {
      const payload: ComparableProduction = {
        ...editingProduction, ...formData,
        lastUpdated: new Date().toISOString().split('T')[0],
      } as ComparableProduction;
      const { data, error } = await adminApi.updateComparable(editingProduction.id, payload);
      if (!error && data) {
        setProductions(productions.map(p => p.id === editingProduction.id ? data : p));
      }
    } else {
      const payload: ComparableProduction = {
        ...formData,
        id: '',
        lastUpdated: new Date().toISOString().split('T')[0],
      } as ComparableProduction;
      const { data, error } = await adminApi.createComparable(payload);
      if (!error && data) {
        setProductions([...productions, data]);
      }
    }
    handleClose();
  };

  const handleSyncTMDB = async () => {
    setSyncing(true);
    setSyncResult(null);
    setFetchError(null);
    const { data, error } = await adminApi.syncComparablesTMDB();
    if (error) {
      setFetchError(error);
    } else if (data) {
      setSyncResult(data);
      const refreshed = await adminApi.getComparables();
      if (refreshed.data) {
        setProductions(refreshed.data.items);
      }
    }
    setSyncing(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await adminApi.deleteComparable(id);
    if (error) {
      setFetchError(error);
    } else {
      setProductions(productions.filter(p => p.id !== id));
    }
  };

  const columns = useMemo<Column<ComparableProduction>[]>(() => [
    {
      key: 'title', header: 'TITLE', width: '1.8fr',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.title}
          </Typography>
          {/* Says the row came from the catalogue sync rather than a curator,
              which is what decides how much to trust its budget. */}
          {r.tmdbId && (
            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: t.textFaint, flexShrink: 0 }}>
              SYNCED
            </Typography>
          )}
        </Box>
      ),
    },
    { key: 'year', header: 'YEAR', width: '0.55fr', sortValue: (r) => r.year ?? 0 },
    {
      key: 'genre', header: 'GENRE', width: '1.2fr',
      sortValue: (r) => (Array.isArray(r.genre) ? r.genre.join(', ') : String(r.genre ?? '')),
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {(Array.isArray(r.genre) ? r.genre : [r.genre]).filter(Boolean).join(', ') || 'Unspecified'}
        </Typography>
      ),
    },
    {
      key: 'budget', header: 'BUDGET', width: '0.8fr', align: 'right',
      sortValue: (r) => r.budget ?? 0,
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {r.budget ? `$${(r.budget / 1_000_000).toFixed(1)}M` : 'Unknown'}
        </Typography>
      ),
    },
    { key: 'territory', header: 'TERRITORY', width: '1.1fr' },
    {
      key: 'incentiveUsed', header: 'INCENTIVE USED', width: '1.2fr',
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: r.incentiveUsed ? t.textSecondary : t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.incentiveUsed || 'Not recorded'}
        </Typography>
      ),
    },
    {
      key: 'source', header: 'SOURCE', width: '0.9fr', filterSelect: true,
      // Explicit, so a row with no recorded source is selectable as "Manual"
      // rather than dropping out of the filter's option list entirely.
      sortValue: (r) => r.source || 'Manual',
      render: (r) => <Box sx={{ color: t.textSecondary, fontSize: 13.5 }}>{r.source || 'Manual'}</Box>,
    },
    {
      key: 'lastUpdated', header: 'UPDATED', width: '0.9fr',
      sortValue: (r) => new Date(r.lastUpdated || 0).getTime() || 0,
      render: (r) => <Box sx={{ color: t.textSecondary, fontSize: 13.5 }}>{r.lastUpdated || 'Unknown'}</Box>,
    },
  ], [t]);

  useHeaderActions(
    <>
      <Button size="small" startIcon={<Refresh />} onClick={handleSyncTMDB} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Sync catalogue'}
      </Button>
      <Button size="small" variant="contained" startIcon={<Add />} onClick={handleAdd}>
        Add production
      </Button>
    </>,
    [syncing],
  );

  return (
    <Box>
      <Typography sx={{ color: 'text.secondary', fontSize: 13.5, mb: 2, maxWidth: '78ch' }}>
        Productions with a known budget, shoot territory and incentive outcome. Reports anchor a projected budget
        against these, so an inaccurate row skews every comparison drawn from it.
      </Typography>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFetchError(null)}>{fetchError}</Alert>
      )}
      {syncResult && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSyncResult(null)}>
          Catalog sync complete: {syncResult.imported} imported, {syncResult.skipped} skipped, {syncResult.total} total
        </Alert>
      )}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      <DataTable<ComparableProduction>
        title="Comparable productions"
        columns={columns}
        rows={productions}
        getRowId={(r) => r.id}
        pageSize={12}
        itemNoun="production"
        minWidth={1080}
        emptyIcon={<MovieFilterOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage="No comparables yet. Reports use these to anchor a budget against real productions, so a thin catalogue weakens every budget comparison."
        rowActions={(r) => (
          <>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleEdit(r)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
                <Edit sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => handleDelete(r.id)} sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}>
                <Delete sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      {/* Edit/Add Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider', } } }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 600 }}>
          {editingProduction ? 'Edit Production' : 'Add Production'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Year"
              type="number"
              value={formData.year ?? ''}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              select
              label="Genre"
              value={Array.isArray(formData.genre) ? formData.genre[0] ?? '' : formData.genre || ''}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              fullWidth
            >
              {genres.map((genre) => (
                <MenuItem key={genre} value={genre}>
                  {genre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Budget ($)"
              type="number"
              value={formData.budget ?? ''}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
              fullWidth
            />
            <TextField
              select
              label="Territory"
              value={formData.territory || ''}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              fullWidth
            >
              {territories.map((territory) => (
                <MenuItem key={territory} value={territory}>
                  {territory}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Incentive Used"
              value={formData.incentiveUsed || ''}
              onChange={(e) => setFormData({ ...formData, incentiveUsed: e.target.value })}
              fullWidth
            />
            <TextField
              label="Catalog ID (optional)"
              value={formData.tmdbId || ''}
              onChange={(e) => setFormData({ ...formData, tmdbId: e.target.value })}
              fullWidth
            />
            <TextField
              label="Source"
              value={formData.source || ''}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            {editingProduction ? 'Update' : 'Add'} Production
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
