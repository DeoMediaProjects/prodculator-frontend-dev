import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit, Add, Refresh, Delete } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { ComparableProduction, TmdbSyncResponse } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

const genres = ['Action', 'Drama', 'Comedy', 'Sci-Fi', 'Thriller', 'Horror', 'Adventure', 'Romance'];
const territories = ['United Kingdom', 'British Columbia', 'Georgia (USA)', 'Malta', 'South Africa'];

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
        ...editingProduction,
        ...formData,
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
            Comparable Productions Database
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Curated database of film/TV productions with budgets, locations, and incentives used
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleSyncTMDB}
            disabled={syncing}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.08)',
              },
            }}
          >
            {syncing ? 'Syncing...' : 'Sync from TMDB'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
            }}
          >
            Add Production
          </Button>
        </Box>
      </Box>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFetchError(null)}>{fetchError}</Alert>
      )}
      {syncResult && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSyncResult(null)}>
          TMDB sync complete: {syncResult.imported} imported, {syncResult.skipped} skipped, {syncResult.total} total
        </Alert>
      )}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#D4AF37' }} />
        </Box>
      )}

      <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Year</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Genre</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Budget</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Territory</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Incentive Used</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Source</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Last Updated</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productions.map((production) => (
                <TableRow key={production.id} sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}>
                  <TableCell sx={{ color: '#ffffff' }}>
                    {production.title}
                    {production.tmdbId && (
                      <Chip
                        label="TMDB"
                        size="small"
                        sx={{
                          ml: 1,
                          bgcolor: 'rgba(3, 169, 244, 0.2)',
                          color: '#03a9f4',
                          fontSize: '0.65rem',
                          height: 18,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>{production.year}</TableCell>
                  <TableCell>
                    {(Array.isArray(production.genre) ? production.genre : [production.genre]).map((g) => (
                      <Chip
                        key={g}
                        label={g}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(212, 175, 55, 0.2)',
                          color: '#D4AF37',
                          fontWeight: 600,
                          mr: 0.5,
                        }}
                      />
                    ))}
                  </TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>
                    ${(production.budget / 1000000).toFixed(1)}M
                  </TableCell>
                  <TableCell sx={{ color: '#ffffff', fontSize: '0.875rem' }}>{production.territory}</TableCell>
                  <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>{production.incentiveUsed}</TableCell>
                  <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>{production.source}</TableCell>
                  <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>{production.lastUpdated}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" onClick={() => handleEdit(production)}>
                      <Edit sx={{ color: '#D4AF37', fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(production.id)}>
                      <Delete sx={{ color: '#f44336', fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit/Add Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          }
        }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 600 }}>
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
              label="TMDB ID (optional)"
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
          <Button onClick={handleClose} sx={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              '&:hover': { bgcolor: '#D4AF37' },
            }}
          >
            {editingProduction ? 'Update' : 'Add'} Production
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
