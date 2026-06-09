import { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Edit,
  Delete,
  MonetizationOn,
  Api,
  Assessment,
  CheckCircle,
  Warning,
  Email,
  Public,
  Schedule,
  Description,
  VpnKey,
  Send,
  Visibility,
  CloudDownload,
  ContentCopy,
} from '@mui/icons-material';

interface B2BClient {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'trial';
  apiKey: string;
  scriptsProcessed: number;
  reportsGenerated: number;
  autoDeliveryEnabled: boolean;
  webhookUrl?: string;
  billingCycle: 'monthly' | 'annual';
  monthlyQuota: number;
  usedQuota: number;
  territory: string;
  currency: 'GBP' | 'USD';
  lastActive: string;
  createdAt: string;
  notes: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function B2BClientManager() {
  const [currentTab, setCurrentTab] = useState(0);
  const [clients, setClients] = useState<B2BClient[]>([
    {
      id: '1',
      name: 'John Smith',
      companyName: 'Paramount Pictures UK',
      email: 'john.smith@paramount.com',
      phone: '+44 20 7xxx xxxx',
      website: 'https://www.paramount.com',
      plan: 'enterprise',
      status: 'active',
      apiKey: 'pk_prod_xxxxxxxxxxxxxxxx',
      scriptsProcessed: 145,
      reportsGenerated: 145,
      autoDeliveryEnabled: true,
      webhookUrl: 'https://paramount.com/webhooks/prodculator',
      billingCycle: 'annual',
      monthlyQuota: 500,
      usedQuota: 145,
      territory: 'UK',
      currency: 'GBP',
      lastActive: '2026-01-27',
      createdAt: '2025-06-15',
      notes: 'Key enterprise client with custom integration',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      companyName: 'Warner Bros. Studios',
      email: 'sarah.j@warnerbros.com',
      phone: '+1 818 xxx xxxx',
      website: 'https://www.warnerbros.com',
      plan: 'professional',
      status: 'active',
      apiKey: 'pk_prod_yyyyyyyyyyyyyyyy',
      scriptsProcessed: 87,
      reportsGenerated: 87,
      autoDeliveryEnabled: true,
      billingCycle: 'monthly',
      monthlyQuota: 100,
      usedQuota: 87,
      territory: 'US',
      currency: 'USD',
      lastActive: '2026-01-26',
      createdAt: '2025-08-20',
      notes: 'Regular user, consistent monthly usage',
    },
    {
      id: '3',
      name: 'Michael Chen',
      companyName: 'Sony Pictures Entertainment',
      email: 'm.chen@sonypictures.com',
      phone: '+1 310 xxx xxxx',
      website: 'https://www.sonypictures.com',
      plan: 'starter',
      status: 'trial',
      apiKey: 'pk_test_zzzzzzzzzzzzzzzz',
      scriptsProcessed: 12,
      reportsGenerated: 12,
      autoDeliveryEnabled: false,
      billingCycle: 'monthly',
      monthlyQuota: 20,
      usedQuota: 12,
      territory: 'US',
      currency: 'USD',
      lastActive: '2026-01-25',
      createdAt: '2026-01-10',
      notes: 'Trial period follows up needed',
    },
  ]);

  const [selectedClient, setSelectedClient] = useState<B2BClient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendReportDialogOpen, setSendReportDialogOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    trialClients: clients.filter(c => c.status === 'trial').length,
    totalRevenue: clients
      .filter(c => c.status === 'active')
      .reduce((sum, c) => {
        const monthlyRevenue = c.plan === 'enterprise' ? 1500 : c.plan === 'professional' ? 299 : 71;
        return sum + monthlyRevenue;
      }, 0),
    scriptsProcessed: clients.reduce((sum, c) => sum + c.scriptsProcessed, 0),
  };

  const handleOpenDialog = (client?: B2BClient) => {
    setSelectedClient(client || null);
    setDialogOpen(true);
  };

  const handleSendReport = (client: B2BClient) => {
    setSelectedClient(client);
    setSendReportDialogOpen(true);
  };

  const handleViewApiKey = (client: B2BClient) => {
    setSelectedClient(client);
    setApiKeyDialogOpen(true);
  };

  const handleDeleteClient = (client: B2BClient) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setDialogOpen(false);
    setSendReportDialogOpen(false);
    setApiKeyDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  const handleSaveClient = () => {
    // In production: call backend API to save client
    handleCloseDialogs();
  };

  const handleConfirmDelete = () => {
    if (selectedClient) {
      setClients(clients.filter(c => c.id !== selectedClient.id));
      handleCloseDialogs();
    }
  };

  const getStatusColor = (status: B2BClient['status']) => {
    switch (status) {
      case 'active':
        return '#66bb6a';
      case 'trial':
        return '#ffa726';
      case 'inactive':
        return '#ef5350';
      default:
        return '#999';
    }
  };

  const getPlanColor = (plan: B2BClient['plan']) => {
    switch (plan) {
      case 'enterprise':
        return '#D4AF37';
      case 'professional':
        return '#d4af37';
      case 'starter':
        return '#999';
      default:
        return '#666';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37' }}>
          B2B Client Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: '#D4AF37',
            color: '#000',
            '&:hover': { bgcolor: '#d4af37' },
          }}
        >
          Add Client
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(102, 187, 106, 0.3)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ color: '#66bb6a' }}><CheckCircle /></Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                  {stats.activeClients}
                </Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Active Clients
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ color: '#D4AF37' }}><MonetizationOn /></Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                  ${stats.totalRevenue.toLocaleString()}/mo
                </Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Monthly Revenue
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(255, 167, 38, 0.3)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ color: '#ffa726' }}><Assessment /></Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                  {stats.scriptsProcessed}
                </Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Scripts Processed
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(255, 167, 38, 0.3)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ color: '#ffa726' }}><Schedule /></Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                  {stats.trialClients}
                </Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Trial Clients
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid #333' }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            borderBottom: '1px solid #333',
            '& .MuiTab-root': { color: '#999' },
            '& .Mui-selected': { color: '#D4AF37' },
            '& .MuiTabs-indicator': { bgcolor: '#D4AF37' },
          }}
        >
          <Tab label="All Clients" />
          <Tab label="Active" />
          <Tab label="Trial" />
          <Tab label="API Access" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <ClientsTable
            clients={clients}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClient}
            onViewApiKey={handleViewApiKey}
            onSendReport={handleSendReport}
            getStatusColor={getStatusColor}
            getPlanColor={getPlanColor}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <ClientsTable
            clients={clients.filter(c => c.status === 'active')}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClient}
            onViewApiKey={handleViewApiKey}
            onSendReport={handleSendReport}
            getStatusColor={getStatusColor}
            getPlanColor={getPlanColor}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <ClientsTable
            clients={clients.filter(c => c.status === 'trial')}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClient}
            onViewApiKey={handleViewApiKey}
            onSendReport={handleSendReport}
            getStatusColor={getStatusColor}
            getPlanColor={getPlanColor}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <ApiAccessPanel clients={clients} />
        </TabPanel>
      </Paper>

      {/* Edit/Add Client Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialogs}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0a0a0a', border: '1px solid #333' } }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 700 }}>
          {selectedClient ? 'Edit Client' : 'Add New Client'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Contact Name"
              defaultValue={selectedClient?.name || ''}
              fullWidth
              sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
            />
            <TextField
              label="Company Name"
              defaultValue={selectedClient?.companyName || ''}
              fullWidth
              sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
            />
            <TextField
              label="Email"
              type="email"
              defaultValue={selectedClient?.email || ''}
              fullWidth
              sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
            />
            <TextField
              label="Phone"
              defaultValue={selectedClient?.phone || ''}
              fullWidth
              sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
            />
            <TextField
              label="Website"
              defaultValue={selectedClient?.website || ''}
              fullWidth
              sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#999' }}>Plan</InputLabel>
                  <Select
                    defaultValue={selectedClient?.plan || 'starter'}
                    label="Plan"
                    sx={{ color: '#fff' }}
                  >
                    <MenuItem value="starter">Starter</MenuItem>
                    <MenuItem value="professional">Professional</MenuItem>
                    <MenuItem value="enterprise">Enterprise</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#999' }}>Status</InputLabel>
                  <Select
                    defaultValue={selectedClient?.status || 'trial'}
                    label="Status"
                    sx={{ color: '#fff' }}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="trial">Trial</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#999' }}>Territory</InputLabel>
                  <Select
                    defaultValue={selectedClient?.territory || 'UK'}
                    label="Territory"
                    sx={{ color: '#fff' }}
                  >
                    <MenuItem value="UK">UK</MenuItem>
                    <MenuItem value="US">US</MenuItem>
                    <MenuItem value="Canada">Canada</MenuItem>
                    <MenuItem value="Australia">Australia</MenuItem>
                    <MenuItem value="New Zealand">New Zealand</MenuItem>
                    <MenuItem value="Malta">Malta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#999' }}>Currency</InputLabel>
                  <Select
                    defaultValue={selectedClient?.currency || 'USD'}
                    label="Currency"
                    sx={{ color: '#fff' }}
                  >
                    <MenuItem value="GBP">GBP</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label="Webhook URL (Optional)"
              defaultValue={selectedClient?.webhookUrl || ''}
              fullWidth
              sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
            />
            <TextField
              label="Notes"
              defaultValue={selectedClient?.notes || ''}
              multiline
              rows={3}
              fullWidth
              sx={{ textarea: { color: '#fff' }, label: { color: '#999' } }}
            />
            <FormControlLabel
              control={<Switch defaultChecked={selectedClient?.autoDeliveryEnabled || false} />}
              label="Enable Auto Delivery"
              sx={{ color: '#999' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} sx={{ color: '#999' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveClient}
            variant="contained"
            sx={{ bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#d4af37' } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog
        open={apiKeyDialogOpen}
        onClose={handleCloseDialogs}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0a0a0a', border: '1px solid #333' } }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 700 }}>API Access</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
              Keep this API key secure. It grants access to your B2B services.
            </Alert>
            <TextField
              label="API Key"
              value={selectedClient?.apiKey || ''}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton size="small">
                    <ContentCopy fontSize="small" />
                  </IconButton>
                ),
              }}
              sx={{ input: { color: '#fff', fontFamily: 'monospace' }, label: { color: '#999' } }}
            />
            <Box>
              <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
                Usage This Month:
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff' }}>
                {selectedClient?.usedQuota} / {selectedClient?.monthlyQuota} scripts
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} sx={{ color: '#999' }}>
            Close
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#d4af37' } }}
          >
            Regenerate Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Report Dialog */}
      <Dialog
        open={sendReportDialogOpen}
        onClose={handleCloseDialogs}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0a0a0a', border: '1px solid #333' } }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 700 }}>Send Test Report</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography sx={{ color: '#999' }}>
              Send a test report to {selectedClient?.companyName}
            </Typography>
            <TextField
              label="Script Title"
              placeholder="Enter script title"
              fullWidth
              sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
            />
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#999' }}>Report Type</InputLabel>
              <Select defaultValue="full" label="Report Type" sx={{ color: '#fff' }}>
                <MenuItem value="full">Full Report</MenuItem>
                <MenuItem value="summary">Summary Report</MenuItem>
                <MenuItem value="financial">Financial Only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} sx={{ color: '#999' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            sx={{ bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#d4af37' } }}
          >
            Send Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDialogs}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0a0a0a', border: '1px solid #333' } }}
      >
        <DialogTitle sx={{ color: '#ef5350', fontWeight: 700 }}>Delete Client</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#999' }}>
            Are you sure you want to delete {selectedClient?.companyName}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} sx={{ color: '#999' }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            sx={{ bgcolor: '#ef5350', color: '#fff', '&:hover': { bgcolor: '#d32f2f' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Clients Table Component
interface ClientsTableProps {
  clients: B2BClient[];
  onEdit: (client: B2BClient) => void;
  onDelete: (client: B2BClient) => void;
  onViewApiKey: (client: B2BClient) => void;
  onSendReport: (client: B2BClient) => void;
  getStatusColor: (status: B2BClient['status']) => string;
  getPlanColor: (plan: B2BClient['plan']) => string;
}

function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onViewApiKey,
  onSendReport,
  getStatusColor,
  getPlanColor,
}: ClientsTableProps) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Company</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Contact</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Plan</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Usage</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Auto Delivery</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Territory</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Last Active</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} hover>
              <TableCell>
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 600 }}>{client.companyName}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    {client.website && (
                      <Tooltip title="Visit Website">
                        <IconButton size="small" sx={{ color: '#999' }}>
                          <Public fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {client.email && (
                      <Tooltip title={client.email}>
                        <IconButton size="small" sx={{ color: '#999' }}>
                          <Email fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Typography sx={{ color: '#fff' }}>{client.name}</Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  {client.phone}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={client.plan.toUpperCase()}
                  size="small"
                  sx={{
                    bgcolor: getPlanColor(client.plan),
                    color: '#000',
                    fontWeight: 700,
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={client.status}
                  size="small"
                  sx={{
                    bgcolor: getStatusColor(client.status),
                    color: '#fff',
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography sx={{ color: '#fff' }}>
                  {client.usedQuota} / {client.monthlyQuota}
                </Typography>
                <Typography variant="caption" sx={{ color: '#999' }}>
                  {((client.usedQuota / client.monthlyQuota) * 100).toFixed(0)}% used
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  icon={client.autoDeliveryEnabled ? <CheckCircle /> : <Warning />}
                  label={client.autoDeliveryEnabled ? 'Enabled' : 'Disabled'}
                  size="small"
                  sx={{
                    bgcolor: client.autoDeliveryEnabled
                      ? 'rgba(102, 187, 106, 0.2)'
                      : 'rgba(255, 167, 38, 0.2)',
                    color: client.autoDeliveryEnabled ? '#66bb6a' : '#ffa726',
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography sx={{ color: '#fff' }}>{client.territory}</Typography>
                <Typography variant="caption" sx={{ color: '#999' }}>
                  {client.currency}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography sx={{ color: '#fff' }}>{client.lastActive}</Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View API Key">
                    <IconButton size="small" onClick={() => onViewApiKey(client)} sx={{ color: '#D4AF37' }}>
                      <VpnKey fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Send Test Report">
                    <IconButton size="small" onClick={() => onSendReport(client)} sx={{ color: '#66bb6a' }}>
                      <Send fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(client)} sx={{ color: '#999' }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete(client)} sx={{ color: '#ef5350' }}>
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
  );
}

// API Access Panel Component
function ApiAccessPanel({ clients }: { clients: B2BClient[] }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#D4AF37', mb: 2 }}>
        API Documentation & Access
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Api sx={{ color: '#D4AF37' }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                  API Endpoints
                </Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Description sx={{ color: '#66bb6a' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="POST /api/v1/scripts/analyze"
                    secondary="Submit script for analysis"
                    primaryTypographyProps={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ color: '#999' }}
                  />
                </ListItem>
                <Divider sx={{ bgcolor: '#333' }} />
                <ListItem>
                  <ListItemIcon>
                    <CloudDownload sx={{ color: '#66bb6a' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="GET /api/v1/reports/:id"
                    secondary="Retrieve generated report"
                    primaryTypographyProps={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ color: '#999' }}
                  />
                </ListItem>
                <Divider sx={{ bgcolor: '#333' }} />
                <ListItem>
                  <ListItemIcon>
                    <Visibility sx={{ color: '#66bb6a' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="GET /api/v1/usage"
                    secondary="Check API usage and quota"
                    primaryTypographyProps={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ color: '#999' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Assessment sx={{ color: '#D4AF37' }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                  Usage Statistics
                </Typography>
              </Box>
              <List>
                {clients.slice(0, 3).map((client) => (
                  <Box key={client.id}>
                    <ListItem>
                      <ListItemText
                        primary={client.companyName}
                        secondary={`${client.usedQuota} / ${client.monthlyQuota} scripts (${((client.usedQuota / client.monthlyQuota) * 100).toFixed(0)}%)`}
                        primaryTypographyProps={{ color: '#fff', fontWeight: 600 }}
                        secondaryTypographyProps={{ color: '#999' }}
                      />
                    </ListItem>
                    <Divider sx={{ bgcolor: '#333' }} />
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3, bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
        <Typography variant="body2" sx={{ color: '#fff', mb: 1 }}>
          <strong>API Authentication:</strong>
        </Typography>
        <Typography variant="body2" sx={{ color: '#999' }}>
          All API requests must include the header: <code style={{ color: '#D4AF37' }}>Authorization: Bearer YOUR_API_KEY</code>
        </Typography>
      </Alert>
    </Box>
  );
}
