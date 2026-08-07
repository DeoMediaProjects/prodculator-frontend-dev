import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Shield,
  CheckCircle,
  Cancel,
  AdminPanelSettings,
  ContentCopy,
} from '@mui/icons-material';
import { useAuth, AdminRole, ROLE_PERMISSIONS } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { AdminUserRecord } from '@/services/admin.types';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { AdminAccessDenied } from './AdminAccessDenied';

const ROLE_LABELS: Record<AdminRole, string> = {
  master_admin: 'Master Admin',
  senior_admin: 'Senior Admin',
  data_admin: 'Data Admin',
  support_admin: 'Support Admin',
};

const ROLE_COLORS: Record<AdminRole, string> = {
  master_admin: 'primary.main',
  senior_admin: 'info.main',
  data_admin: 'success.main',
  support_admin: '#ab47bc',
};

export function AdminUsersManager() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { hasAdminPermission, adminUser } = useAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUserRecord | null>(null);

  // Temp password dialog (shown after create)
  const [tempPasswordDialogOpen, setTempPasswordDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [createdAdminEmail, setCreatedAdminEmail] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<AdminRole>('support_admin');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAdminUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const { data, error: fetchError } = await adminApi.getAdminUsers(50, 0, signal);
    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setAdminUsers(data.items);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAdminUsers(controller.signal);
    return () => controller.abort();
  }, [fetchAdminUsers]);

  // Permission gate, must run AFTER all hooks so hook order stays stable across
  // renders (Rules of Hooks). Previously this early return preceded the
  // useCallback/useEffect above, so the hook count changed when the permission
  // flag flipped between renders, which crashes React.
  if (!hasAdminPermission('canManageAdmins')) {
    return (
      <AdminAccessDenied
        requiredPermission="Manage Admin Users"
        requiredRole="Master Admin"
      />
    );
  }

  const handleAddAdmin = async () => {
    setSaving(true);
    setFormError(null);
    const { data, error: createError } = await adminApi.createAdminUser({
      email: formEmail,
      name: formName || undefined,
      role: formRole,
    });

    if (createError) {
      setFormError(createError);
      setSaving(false);
      return;
    }

    if (data) {
      setCreatedAdminEmail(data.admin.email);
      setTempPassword(data.temporary_password);
      setAddDialogOpen(false);
      resetForm();
      setTempPasswordDialogOpen(true);
      await fetchAdminUsers();
    }
    setSaving(false);
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;
    setSaving(true);
    setFormError(null);

    const payload: Record<string, string> = {};
    if (formName !== selectedAdmin.name) payload.name = formName;
    if (formEmail !== selectedAdmin.email) payload.email = formEmail;
    if (formRole !== selectedAdmin.role) payload.role = formRole;

    if (Object.keys(payload).length === 0) {
      setEditDialogOpen(false);
      setSelectedAdmin(null);
      resetForm();
      setSaving(false);
      return;
    }

    const { error: updateError } = await adminApi.updateAdminUser(selectedAdmin.id, payload);

    if (updateError) {
      setFormError(updateError);
      setSaving(false);
      return;
    }

    setEditDialogOpen(false);
    setSelectedAdmin(null);
    resetForm();
    await fetchAdminUsers();
    setSaving(false);
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    setSaving(true);

    const { error: deleteError } = await adminApi.deleteAdminUser(selectedAdmin.id);

    if (deleteError) {
      setError(deleteError);
      setSaving(false);
      return;
    }

    setDeleteDialogOpen(false);
    setSelectedAdmin(null);
    await fetchAdminUsers();
    setSaving(false);
  };

  const openEditDialog = (admin: AdminUserRecord) => {
    setSelectedAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormRole(admin.role);
    setFormError(null);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (admin: AdminUserRecord) => {
    setSelectedAdmin(admin);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('support_admin');
    setFormError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const columns = useMemo<Column<AdminUserRecord>[]>(() => [
    {
      key: 'name', header: 'NAME', width: '1.3fr',
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.name || 'Unnamed'}
        </Typography>
      ),
    },
    { key: 'email', header: 'EMAIL', width: '1.7fr' },
    {
      key: 'role', header: 'ROLE', width: '1.1fr',
      sortValue: (r) => ROLE_LABELS[r.role] || r.role,
      render: (r) => (
        // Role is the only thing on this row that changes what the account can
        // do, so it is the one value that carries colour.
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: ROLE_COLORS[r.role] || t.textSecondary }}>
          {ROLE_LABELS[r.role] || r.role}
        </Typography>
      ),
    },
    {
      key: 'created_at', header: 'CREATED', width: '0.85fr',
      sortValue: (r) => new Date(r.created_at || 0).getTime() || 0,
      render: (r) => (
        <Box sx={{ color: t.textSecondary, fontSize: 13.5 }}>
          {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Unknown'}
        </Box>
      ),
    },
    {
      key: 'last_login', header: 'LAST SIGN IN', width: '0.95fr',
      sortValue: (r) => new Date(r.last_login || 0).getTime() || 0,
      render: (r) => (
        // "Never" is the value worth noticing here: an account that has never
        // signed in is either unused or was provisioned and forgotten.
        <Box sx={{ color: r.last_login ? t.textSecondary : t.warning, fontSize: 13.5 }}>
          {r.last_login ? new Date(r.last_login).toLocaleDateString() : 'Never'}
        </Box>
      ),
    },
  ], [t]);

  useHeaderActions(
    <Button
      variant="contained"
      size="small"
      startIcon={<Add />}
      onClick={() => { resetForm(); setAddDialogOpen(true); }}
    >
      Add admin
    </Button>,
    [],
  );

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography sx={{ color: 'text.secondary', fontSize: 13.5, mb: 2, maxWidth: '78ch' }}>
        Every account here can sign in to this console. Role decides what it can reach, so treat granting one as
        granting the permissions listed further down this page. You are signed in as{' '}
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{adminUser?.email}</Box>{' '}
        ({ROLE_LABELS[adminUser?.role || 'support_admin']}).
      </Typography>

      <DataTable<AdminUserRecord>
        title="Admin accounts"
        columns={columns}
        rows={adminUsers}
        getRowId={(r) => r.id}
        pageSize={12}
        itemNoun="account"
        minWidth={860}
        emptyIcon={<AdminPanelSettings sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage="No admin accounts yet. The seeded master admin is the only way in until another is created here."
        rowActions={(r) => (
          <>
            <Tooltip title="Edit role or details">
              <IconButton size="small" onClick={() => openEditDialog(r)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
                <Edit sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={r.id === adminUser?.id ? 'You cannot remove your own account' : 'Remove this admin'}>
              <span>
                <IconButton
                  size="small"
                  disabled={r.id === adminUser?.id}
                  onClick={() => openDeleteDialog(r)}
                  sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}
                >
                  <Delete sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      />

      {/* Role Permissions Reference */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 3 }}>
        Role Permissions Reference
      </Typography>

      <Grid container spacing={3}>
        {(Object.keys(ROLE_PERMISSIONS) as AdminRole[]).map((role) => (
          <Grid size={{ xs: 12, md: 6 }} key={role}>
            <Card
              sx={{
                bgcolor: 'background.paper',
                border: `2px solid ${ROLE_COLORS[role]}40`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Shield sx={{ color: ROLE_COLORS[role], fontSize: 32 }} />
                  <Typography variant="h6" sx={{ color: ROLE_COLORS[role], fontWeight: 600 }}>
                    {ROLE_LABELS[role]}
                  </Typography>
                </Box>

                <List dense>
                  {Object.entries(ROLE_PERMISSIONS[role]).map(([permission, enabled]) => (
                    <ListItem key={permission} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {enabled ? (
                              <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                            ) : (
                              <Cancel sx={{ color: 'text.secondary', fontSize: 18 }} />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                color: enabled ? '#ffffff' : '#666',
                                fontSize: '0.875rem',
                              }}
                            >
                              {permission
                                .replace(/^can/, '')
                                .replace(/([A-Z])/g, ' $1')
                                .trim()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Admin Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: 1, borderColor: 'divider',
          },
        }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 600 }}>Add New Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: 'error.main' }}>
                {formError}
              </Alert>
            )}
            <TextField
              label="Full Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email Address"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Admin Role</InputLabel>
              <Select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as AdminRole)}
                label="Admin Role"
              >
                {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
                  <MenuItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formRole && (
              <Alert
                severity="info"
                sx={{
                  bgcolor: `${ROLE_COLORS[formRole]}20`,
                  color: ROLE_COLORS[formRole],
                  border: `1px solid ${ROLE_COLORS[formRole]}40`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {ROLE_LABELS[formRole]} Permissions:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6 }}>
                  {Object.entries(ROLE_PERMISSIONS[formRole])
                    .filter(([, enabled]) => enabled)
                    .map(([permission]) =>
                      permission
                        .replace(/^can/, '')
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                    )
                    .join(', ')}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setAddDialogOpen(false);
              resetForm();
            }}
            sx={{ color: 'text.secondary' }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddAdmin}
            disabled={!formEmail || saving}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: 'primary.contrastText' }} /> : 'Add Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog
        open={tempPasswordDialogOpen}
        onClose={() => setTempPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: 1, borderColor: 'divider',
          },
        }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 600 }}>Admin Created Successfully</DialogTitle>
        <DialogContent>
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              bgcolor: 'rgba(255, 152, 0, 0.1)',
              color: 'warning.main',
              border: '1px solid rgba(255, 152, 0, 0.3)',
            }}
          >
            Save this temporary password now. It won't be shown again.
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Admin: <strong style={{ color: 'text.primary' }}>{createdAdminEmail}</strong>
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'action.hover',
              border: 1, borderColor: 'divider',
              borderRadius: 1,
              p: 2,
            }}
          >
            <Typography
              variant="body1"
              sx={{ color: 'primary.main', fontFamily: 'monospace', fontWeight: 600, flex: 1 }}
            >
              {tempPassword}
            </Typography>
            <Tooltip title="Copy to clipboard">
              <IconButton
                size="small"
                onClick={() => copyToClipboard(tempPassword)}
                sx={{ color: 'primary.main' }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            variant="contained"
            onClick={() => setTempPasswordDialogOpen(false)}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedAdmin(null);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: 1, borderColor: 'divider',
          },
        }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 600 }}>Edit Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: 'error.main' }}>
                {formError}
              </Alert>
            )}
            <TextField
              label="Full Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email Address"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Admin Role</InputLabel>
              <Select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as AdminRole)}
                label="Admin Role"
              >
                {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
                  <MenuItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedAdmin(null);
              resetForm();
            }}
            sx={{ color: 'text.secondary' }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditAdmin}
            disabled={saving}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: 'primary.contrastText' }} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedAdmin(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '2px solid rgba(244, 67, 54, 0.4)',
          },
        }}
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>Delete Admin?</DialogTitle>
        <DialogContent>
          <Alert
            severity="error"
            sx={{
              mb: 2,
              bgcolor: 'rgba(244, 67, 54, 0.1)',
              color: 'error.main',
            }}
          >
            <strong>Warning:</strong> This action cannot be undone!
          </Alert>
          <Typography variant="body1" sx={{ color: 'text.primary' }}>
            Are you sure you want to delete <strong>{selectedAdmin?.name}</strong> (
            {selectedAdmin?.email})?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedAdmin(null);
            }}
            sx={{ color: 'text.secondary' }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteAdmin}
            disabled={saving}
            sx={{
              bgcolor: 'error.main',
              color: 'text.primary',
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: 'text.primary' }} /> : 'Delete Admin'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
