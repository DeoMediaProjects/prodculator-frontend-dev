import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
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
  Person,
  AdminPanelSettings,
  ContentCopy,
} from '@mui/icons-material';
import { useAuth, AdminRole, ROLE_PERMISSIONS } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { AdminUserRecord } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

const ROLE_LABELS: Record<AdminRole, string> = {
  master_admin: 'Master Admin',
  senior_admin: 'Senior Admin',
  data_admin: 'Data Admin',
  support_admin: 'Support Admin',
};

const ROLE_COLORS: Record<AdminRole, string> = {
  master_admin: '#D4AF37',
  senior_admin: '#42a5f5',
  data_admin: '#66bb6a',
  support_admin: '#ab47bc',
};

export function AdminUsersManager() {
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

  // Permission gate
  if (!hasAdminPermission('canManageAdmins')) {
    return (
      <AdminAccessDenied
        requiredPermission="Manage Admin Users"
        requiredRole="Master Admin"
      />
    );
  }

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
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
            Admin User Management
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0a0a0' }}>
            Manage admin accounts and assign role based permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}
          sx={{
            bgcolor: '#D4AF37',
            color: '#000000',
            fontWeight: 600,
            '&:hover': { bgcolor: '#D4AF37' },
          }}
        >
          Add Admin
        </Button>
      </Box>

      {/* Current Admin Info */}
      <Alert
        icon={<AdminPanelSettings />}
        sx={{
          mb: 3,
          bgcolor: 'rgba(212, 175, 55, 0.1)',
          color: '#D4AF37',
          border: '1px solid rgba(212, 175, 55, 0.3)',
        }}
      >
        <Typography variant="body2">
          <strong>Logged in as:</strong> {adminUser?.name} ({adminUser?.email}){' '}
          <strong>{ROLE_LABELS[adminUser?.role || 'support_admin']}</strong>
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#f44336' }}>
          {error}
        </Alert>
      )}

      {/* Admin Users Table */}
      <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', mb: 4 }}>
        <CardContent>
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Created</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Last Login</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adminUsers.map((admin) => (
                  <TableRow
                    key={admin.id}
                    sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}
                  >
                    <TableCell sx={{ color: '#ffffff', fontWeight: 500 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ color: '#D4AF37', fontSize: 20 }} />
                        {admin.name}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#a0a0a0' }}>{admin.email}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<Shield sx={{ fontSize: 16 }} />}
                        label={ROLE_LABELS[admin.role]}
                        size="small"
                        sx={{
                          bgcolor: `${ROLE_COLORS[admin.role]}20`,
                          color: ROLE_COLORS[admin.role],
                          fontWeight: 600,
                          border: `1px solid ${ROLE_COLORS[admin.role]}40`,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>
                      {admin.created_at
                        ? new Date(admin.created_at).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>
                      {admin.last_login
                        ? new Date(admin.last_login).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit Admin">
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(admin)}
                            sx={{ color: '#D4AF37' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Admin">
                          <IconButton
                            size="small"
                            onClick={() => openDeleteDialog(admin)}
                            sx={{ color: '#f44336' }}
                            disabled={admin.id === adminUser?.id}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Role Permissions Reference */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#D4AF37', mb: 3 }}>
        Role Permissions Reference
      </Typography>

      <Grid container spacing={3}>
        {(Object.keys(ROLE_PERMISSIONS) as AdminRole[]).map((role) => (
          <Grid size={{ xs: 12, md: 6 }} key={role}>
            <Card
              sx={{
                bgcolor: '#0a0a0a',
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
                              <CheckCircle sx={{ color: '#66bb6a', fontSize: 18 }} />
                            ) : (
                              <Cancel sx={{ color: '#666', fontSize: 18 }} />
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
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 600 }}>Add New Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#f44336' }}>
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
            sx={{ color: '#a0a0a0' }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddAdmin}
            disabled={!formEmail || saving}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              '&:hover': { bgcolor: '#D4AF37' },
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Add Admin'}
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
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 600 }}>Admin Created Successfully</DialogTitle>
        <DialogContent>
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              bgcolor: 'rgba(255, 152, 0, 0.1)',
              color: '#ff9800',
              border: '1px solid rgba(255, 152, 0, 0.3)',
            }}
          >
            Save this temporary password now. It won't be shown again.
          </Alert>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
            Admin: <strong style={{ color: '#ffffff' }}>{createdAdminEmail}</strong>
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 1,
              p: 2,
            }}
          >
            <Typography
              variant="body1"
              sx={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 600, flex: 1 }}
            >
              {tempPassword}
            </Typography>
            <Tooltip title="Copy to clipboard">
              <IconButton
                size="small"
                onClick={() => copyToClipboard(tempPassword)}
                sx={{ color: '#D4AF37' }}
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
              bgcolor: '#D4AF37',
              color: '#000000',
              '&:hover': { bgcolor: '#D4AF37' },
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
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 600 }}>Edit Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#f44336' }}>
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
            sx={{ color: '#a0a0a0' }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditAdmin}
            disabled={saving}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              '&:hover': { bgcolor: '#D4AF37' },
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Save Changes'}
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
            bgcolor: '#0a0a0a',
            border: '2px solid rgba(244, 67, 54, 0.4)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#f44336', fontWeight: 600 }}>Delete Admin?</DialogTitle>
        <DialogContent>
          <Alert
            severity="error"
            sx={{
              mb: 2,
              bgcolor: 'rgba(244, 67, 54, 0.1)',
              color: '#f44336',
            }}
          >
            <strong>Warning:</strong> This action cannot be undone!
          </Alert>
          <Typography variant="body1" sx={{ color: '#ffffff' }}>
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
            sx={{ color: '#a0a0a0' }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteAdmin}
            disabled={saving}
            sx={{
              bgcolor: '#f44336',
              color: '#ffffff',
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Delete Admin'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
