import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Menu,
  MenuItem,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
  type SelectChangeEvent,
} from '@mui/material';
import {
  CheckCircle,
  Circle,
  RadioButtonUnchecked,
  CalendarToday,
  Add,
  MoreVert,
  Delete,
  Event,
  AutoAwesome,
} from '@mui/icons-material';
import {
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  updateTask,
  createTask,
  deleteTask,
  seedMilestones,
  type MilestoneResponse,
} from '@/services/milestone.service';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

interface ProductionTimelineProps {
  userPlan: 'free' | 'professional' | 'studio';
  reports?: Array<{ id: string; title: string }>;
}

export function ProductionTimeline({ userPlan, reports = [] }: ProductionTimelineProps) {
  const { mode } = useThemeMode();
  const c = tokens(mode);
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // Dialog state
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');

  // Add task dialog
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskMilestoneId, setAddTaskMilestoneId] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  // Context menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  const canAddCustomMilestones = userPlan !== 'free';

  // ── Fetch milestones ───────────────────────────────────────────────────

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchMilestones(selectedReportId || undefined);
    if (err) {
      setError(err);
    } else if (data) {
      setMilestones(data.milestones ?? []);
    }
    setLoading(false);
  }, [selectedReportId]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  // Scope the timeline to a single report (the latest) instead of merging every
  // report's milestones together — merging is what produced duplicate-looking
  // entries. The Filter dropdown still lets the user switch reports.
  useEffect(() => {
    if (!selectedReportId && reports.length > 0) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  // Auto-derive the timeline from the report's analysis the first time a report
  // with no milestones is viewed, so it is dynamic without a manual seed click.
  const autoSeededRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading || seeding || error) return;
    if (selectedReportId && milestones.length === 0 && !autoSeededRef.current.has(selectedReportId)) {
      autoSeededRef.current.add(selectedReportId);
      handleSeed(selectedReportId);
    }
  }, [loading, seeding, error, selectedReportId, milestones.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task toggle (optimistic) ───────────────────────────────────────────

  const handleTaskToggle = async (milestoneId: string, taskId: string, currentCompleted: boolean) => {
    // Optimistic update
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m;
        const updatedTasks = m.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !currentCompleted } : t,
        );
        const allDone = updatedTasks.every((t) => t.completed);
        const anyDone = updatedTasks.some((t) => t.completed);
        let newStatus = m.status;
        if (allDone) newStatus = 'completed';
        else if (anyDone) newStatus = 'in-progress';
        else newStatus = 'upcoming';
        return { ...m, tasks: updatedTasks, status: newStatus };
      }),
    );

    // Persist
    const { error: err } = await updateTask(milestoneId, taskId, {
      completed: !currentCompleted,
    });
    if (err) {
      // Revert on failure
      loadMilestones();
    } else {
      // Check if we need to update milestone status
      const milestone = milestones.find((m) => m.id === milestoneId);
      if (milestone) {
        const updatedTasks = milestone.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !currentCompleted } : t,
        );
        const allDone = updatedTasks.every((t) => t.completed);
        const anyDone = updatedTasks.some((t) => t.completed);
        let newStatus: 'completed' | 'in-progress' | 'upcoming' = 'upcoming';
        if (allDone) newStatus = 'completed';
        else if (anyDone) newStatus = 'in-progress';

        if (newStatus !== milestone.status) {
          await updateMilestone(milestoneId, { status: newStatus });
        }
      }
    }
  };

  // ── Add milestone ──────────────────────────────────────────────────────

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    const { data, error: err } = await createMilestone({
      title: newMilestoneTitle.trim(),
      description: newMilestoneDescription.trim() || undefined,
      report_id: selectedReportId || undefined,
    });
    if (err) {
      setError(err);
    } else if (data) {
      setMilestones((prev) => [...prev, data]);
    }
    setAddMilestoneOpen(false);
    setNewMilestoneTitle('');
    setNewMilestoneDescription('');
  };

  // ── Delete milestone ───────────────────────────────────────────────────

  const handleDeleteMilestone = async (id: string) => {
    setMenuAnchor(null);
    const { error: err } = await deleteMilestone(id);
    if (err) {
      setError(err);
    } else {
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // ── Add task ───────────────────────────────────────────────────────────

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !addTaskMilestoneId) return;
    const { data, error: err } = await createTask(addTaskMilestoneId, {
      text: newTaskText.trim(),
      deadline: newTaskDeadline || undefined,
    });
    if (err) {
      setError(err);
    } else if (data) {
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === addTaskMilestoneId ? { ...m, tasks: [...m.tasks, data] } : m,
        ),
      );
    }
    setAddTaskOpen(false);
    setNewTaskText('');
    setNewTaskDeadline('');
    setAddTaskMilestoneId('');
  };

  // ── Delete task ────────────────────────────────────────────────────────

  const handleDeleteTask = async (milestoneId: string, taskId: string) => {
    const { error: err } = await deleteTask(milestoneId, taskId);
    if (err) {
      setError(err);
    } else {
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId
            ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) }
            : m,
        ),
      );
    }
  };

  // ── Seed from report ───────────────────────────────────────────────────

  const handleSeed = async (reportId: string) => {
    setSeeding(true);
    setError(null);
    const { data, error: err } = await seedMilestones(reportId);
    if (err) {
      setError(err);
    } else if (data) {
      setMilestones(data.milestones);
      setSelectedReportId(reportId);
    }
    setSeeding(false);
  };

  // ── Calendar export placeholder ────────────────────────────────────────

  const exportToCalendar = () => {
    if (!milestones.length) return;
    // Generate simple .ics content
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Prodculator//Timeline//EN',
    ];
    for (const m of milestones) {
      if (!m.due_date) continue;
      const dateStr = m.due_date.replace(/-/g, '').slice(0, 8);
      lines.push('BEGIN:VEVENT');
      lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
      lines.push(`SUMMARY:${m.title}`);
      lines.push(`DESCRIPTION:${m.description || ''}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'production-timeline.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle sx={{ color: c.success }} />;
      case 'in-progress': return <Circle sx={{ color: c.gold }} />;
      default: return <RadioButtonUnchecked sx={{ color: c.textFaint }} />;
    }
  };

  const inProgressIdx = milestones.findIndex((m) => m.status === 'in-progress');
  const [expandedStep, setExpandedStep] = useState<number>(inProgressIdx >= 0 ? inProgressIdx : 0);

  // Keep expandedStep in sync when milestones change (e.g. after seed/load)
  useEffect(() => {
    const idx = milestones.findIndex((m) => m.status === 'in-progress');
    setExpandedStep(idx >= 0 ? idx : 0);
  }, [milestones.length]);

  // Push the timeline actions into the dashboard top bar (next to New Analysis).
  useHeaderActions(
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {reports.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Filter by Report</InputLabel>
          <Select value={selectedReportId} label="Filter by Report" onChange={(e: SelectChangeEvent) => setSelectedReportId(e.target.value)}>
            <MenuItem value="">All Reports</MenuItem>
            {reports.map((r) => <MenuItem key={r.id} value={r.id}>{r.title}</MenuItem>)}
          </Select>
        </FormControl>
      )}
      <Button variant="outlined" startIcon={<Event />} onClick={exportToCalendar} disabled={!milestones.length} sx={{ whiteSpace: 'nowrap' }}>Export to Calendar</Button>
      {canAddCustomMilestones && (
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddMilestoneOpen(true)} sx={{ whiteSpace: 'nowrap' }}>Add Milestone</Button>
      )}
    </Box>,
    [reports.length, selectedReportId, milestones.length, canAddCustomMilestones],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Actions (Filter / Export / Add Milestone) live in the dashboard top bar. */}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Empty state — offer seeding */}
      {!milestones.length && !error && (
        <Paper
          sx={{
            p: 4, textAlign: 'center', bgcolor: c.cardBg,
            border: `1px solid ${c.border}`, borderRadius: '16px',
          }}
        >
          <AutoAwesome sx={{ fontSize: 48, color: c.gold, mb: 2 }} />
          <Typography variant="h6" sx={{ color: c.textPrimary, mb: 1 }}>
            No milestones yet
          </Typography>
          <Typography variant="body2" sx={{ color: c.textSecondary, mb: 3 }}>
            Generate a production timeline from one of your analysis reports, or create milestones manually.
          </Typography>
          {reports.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              {reports.slice(0, 3).map((r) => (
                <Button
                  key={r.id}
                  variant="outlined"
                  size="small"
                  startIcon={seeding ? <CircularProgress size={16} sx={{ color: '#D4AF37' }} /> : <AutoAwesome />}
                  disabled={seeding}
                  onClick={() => handleSeed(r.id)}
                  sx={{
                    borderColor: '#D4AF37',
                    color: '#D4AF37',
                    '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.1)' },
                  }}
                >
                  Generate from "{r.title}"
                </Button>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#666' }}>
              Complete a script analysis first to auto generate milestones.
            </Typography>
          )}
          {canAddCustomMilestones && (
            <Button
              variant="text"
              size="small"
              onClick={() => setAddMilestoneOpen(true)}
              sx={{ color: '#a0a0a0', mt: 2 }}
            >
              Or create a milestone manually
            </Button>
          )}
          {!canAddCustomMilestones && (
            <Button
              size="small"
              sx={{ color: '#D4AF37', fontWeight: 600, mt: 2 }}
              onClick={() => window.location.href = '/pricing'}
            >
              Upgrade for Custom Milestones
            </Button>
          )}
        </Paper>
      )}

      {/* Timeline Stepper */}
      {milestones.length > 0 && (
        <Paper
          sx={{
            p: 3, bgcolor: c.cardBg,
            border: `1px solid ${c.border}`, borderRadius: '16px',
            maxHeight: '60vh', overflowY: 'auto',
          }}
        >
          <Stepper nonLinear activeStep={expandedStep} orientation="vertical">
            {milestones.map((milestone, stepIndex) => (
              <Step key={milestone.id} completed={milestone.status === 'completed'} active={stepIndex === expandedStep}>
                <StepLabel
                  onClick={() => setExpandedStep(stepIndex)}
                  StepIconComponent={() => getStatusIcon(milestone.status)}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiStepLabel-label': {
                      color: milestone.status === 'completed' ? c.success : c.textPrimary,
                      fontWeight: 600,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" sx={{ color: c.textPrimary, fontWeight: 600 }}>
                      {milestone.title}
                    </Typography>
                    {milestone.due_date && (
                      <Chip
                        label={milestone.due_date.slice(0, 10)}
                        size="small"
                        icon={<CalendarToday />}
                        sx={{
                          bgcolor: milestone.status === 'in-progress'
                            ? 'rgba(212, 175, 55, 0.2)'
                            : 'rgba(102, 102, 102, 0.2)',
                          color: milestone.status === 'in-progress' ? c.gold : c.textSecondary,
                          '& .MuiChip-icon': {
                            color: milestone.status === 'in-progress' ? c.gold : c.textSecondary,
                            fontSize: '14px',
                          },
                        }}
                      />
                    )}
                    {milestone.is_custom && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setMenuAnchor(e.currentTarget);
                          setSelectedMilestoneId(milestone.id);
                        }}
                        sx={{ color: '#a0a0a0' }}
                      >
                        <MoreVert />
                      </IconButton>
                    )}
                  </Box>
                  {milestone.description && (
                    <Typography variant="body2" sx={{ color: c.textSecondary, mt: 0.5 }}>
                      {milestone.description}
                    </Typography>
                  )}
                </StepLabel>
                <StepContent>
                  <Box sx={{ ml: 2, mt: 2 }}>
                    <List sx={{ p: 0 }}>
                      {milestone.tasks.map((task, index) => (
                        <Box key={task.id}>
                          <ListItem
                            sx={{ px: 0, py: 1, opacity: task.completed ? 0.6 : 1 }}
                            secondaryAction={
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleDeleteTask(milestone.id, task.id)}
                                sx={{ color: '#444', '&:hover': { color: '#ff6b6b' } }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            }
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox
                                checked={task.completed}
                                onChange={() => handleTaskToggle(milestone.id, task.id, task.completed)}
                                sx={{
                                  color: c.textSecondary,
                                  '&.Mui-checked': { color: c.success },
                                }}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      color: task.completed ? c.textSecondary : c.textPrimary,
                                      textDecoration: task.completed ? 'line-through' : 'none',
                                    }}
                                  >
                                    {task.text}
                                  </Typography>
                                  {task.territory && (
                                    <Chip
                                      label={task.territory}
                                      size="small"
                                      sx={{
                                        bgcolor: 'rgba(212, 175, 55, 0.15)',
                                        color: '#D4AF37',
                                        fontSize: '0.7rem',
                                        height: '20px',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                task.deadline && (
                                  <Typography variant="caption" sx={{ color: '#ff9800' }}>
                                    Deadline: {task.deadline.slice(0, 10)}
                                  </Typography>
                                )
                              }
                            />
                          </ListItem>
                          {index < milestone.tasks.length - 1 && (
                            <Divider sx={{ borderColor: 'rgba(212, 175, 55, 0.1)' }} />
                          )}
                        </Box>
                      ))}
                    </List>

                    {/* Add task button */}
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => {
                        setAddTaskMilestoneId(milestone.id);
                        setAddTaskOpen(true);
                      }}
                      sx={{ color: c.textSecondary, mt: 1, '&:hover': { color: c.gold } }}
                    >
                      Add Task
                    </Button>

                    {milestone.status === 'completed' && (
                      <Alert
                        severity="success"
                        icon={<CheckCircle />}
                        sx={{
                          mt: 2,
                          bgcolor: 'rgba(76, 175, 80, 0.1)',
                          '& .MuiAlert-icon': { color: '#4caf50' },
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#4caf50' }}>
                          Milestone completed!
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {/* Seed CTA (when milestones exist but user may want to regenerate) */}
      {milestones.length > 0 && reports.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            startIcon={seeding ? <CircularProgress size={14} sx={{ color: c.gold }} /> : <AutoAwesome />}
            disabled={seeding}
            onClick={() => handleSeed(reports[0].id)}
            sx={{ color: c.textSecondary, '&:hover': { color: c.gold } }}
          >
            Regenerate from latest report
          </Button>
        </Box>
      )}

      {/* Add Milestone Dialog */}
      <Dialog
        open={addMilestoneOpen}
        onClose={() => setAddMilestoneOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            minWidth: '400px',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
          Add Custom Milestone
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Milestone Title"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            placeholder="e.g., Finalize Budget, Hire Key Crew"
            sx={{ ...textFieldSx, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={newMilestoneDescription}
            onChange={(e) => setNewMilestoneDescription(e.target.value)}
            multiline
            rows={2}
            sx={textFieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <Button onClick={() => setAddMilestoneOpen(false)} sx={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMilestone}
            disabled={!newMilestoneTitle.trim()}
            sx={{
              bgcolor: '#D4AF37', color: '#000000', fontWeight: 600,
              '&:hover': { bgcolor: '#D4AF37' },
              '&:disabled': { bgcolor: 'rgba(212, 175, 55, 0.3)', color: 'rgba(0,0,0,0.5)' },
            }}
          >
            Add Milestone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            minWidth: '400px',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
          Add Task
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Task"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="e.g., Contact film commission"
            sx={{ ...textFieldSx, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Deadline (optional)"
            type="date"
            value={newTaskDeadline}
            onChange={(e) => setNewTaskDeadline(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={textFieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <Button onClick={() => setAddTaskOpen(false)} sx={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddTask}
            disabled={!newTaskText.trim()}
            sx={{
              bgcolor: '#D4AF37', color: '#000000', fontWeight: 600,
              '&:hover': { bgcolor: '#D4AF37' },
              '&:disabled': { bgcolor: 'rgba(212, 175, 55, 0.3)', color: 'rgba(0,0,0,0.5)' },
            }}
          >
            Add Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Milestone Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedMilestoneId) handleDeleteMilestone(selectedMilestoneId);
          }}
          sx={{ color: '#ff6b6b' }}
        >
          <Delete sx={{ mr: 1, fontSize: '1rem' }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ── Shared MUI sx for text fields ────────────────────────────────────────────

const textFieldSx = {
  '& .MuiInputLabel-root': { color: '#a0a0a0' },
  '& .MuiOutlinedInput-root': {
    color: '#ffffff',
    '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
    '&:hover fieldset': { borderColor: '#D4AF37' },
    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
  },
};
