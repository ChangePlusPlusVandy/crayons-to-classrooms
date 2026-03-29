import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UndoIcon from '@mui/icons-material/Undo';
import EditIcon from '@mui/icons-material/Edit';
import { activityLogStyles } from './ActivityLog.styles';
import { getActivities, ActivityDisplay } from '../../api/activities';
import { undoInventoryMovement } from '../../api/moveItem';
import { EditAddDialog } from '../EditAddDialog/EditAddDialog';
import { EditMoveDialog } from '../EditMoveDialog/EditMoveDialog';

const ACTION_COLORS: Record<string, string> = {
  ADD: '#4caf50',
  MOVE: '#2196f3',
  CHECKOUT: '#ff9800',
  DISCARD: '#f44336',
  ADJUSTMENT: '#9c27b0',
  DONATED: '#e91e63',
};

const PAGE_SIZE = 4;

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'A few seconds ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ActivityLog() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState<ActivityDisplay | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [undoSnackbar, setUndoSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [undoConfirmDialog, setUndoConfirmDialog] = useState<{
    open: boolean;
    activity: ActivityDisplay | null;
  }>({ open: false, activity: null });

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getActivities(1, PAGE_SIZE);
        setActivities(data.data);
      } catch (err) {
        console.error('Failed to load activity log data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleUndoClick = (activity: ActivityDisplay) => {
    if (!activity.id) return;
    if (activity.inventory_action !== 'MOVE' && activity.inventory_action !== 'ADD') {
      setUndoSnackbar({
        open: true,
        message: `Cannot undo ${activity.inventory_action} actions`,
        severity: 'error',
      });
      return;
    }
    setUndoConfirmDialog({ open: true, activity });
  };

  const handleUndoConfirm = async () => {
    const activity = undoConfirmDialog.activity;
    setUndoConfirmDialog({ open: false, activity: null });
    if (!activity?.id) return;

    setUndoingId(activity.id);
    try {
      await undoInventoryMovement(activity.id);
      setUndoSnackbar({
        open: true,
        message: `Undid ${activity.inventory_action} for ${activity.product_name || 'item'}`,
        severity: 'success',
      });
      const data = await getActivities(1, PAGE_SIZE);
      setActivities(data.data);
    } catch (err) {
      setUndoSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to undo',
        severity: 'error',
      });
    } finally {
      setUndoingId(null);
    }
  };

  const handleEditClick = (activity: ActivityDisplay) => {
    if (activity.inventory_action === 'ADD' || activity.inventory_action === 'MOVE') {
      setEditingMovement(activity);
    }
  };

  const handleEditClose = () => {
    setEditingMovement(null);
  };

  const handleEditSuccess = async () => {
    setShowSuccessAlert(true);
    setEditingMovement(null);
    try {
      const data = await getActivities(1, PAGE_SIZE);
      setActivities(data.data);
    } catch (err) {
      console.error('Failed to refresh activities:', err);
    }
  };

  return (
    <>
      <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Activity Log
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={activityLogStyles.activitiesContainer}>
              {activities.map((activity) => {
                const fromLabel = activity.from_location_name ?? undefined;
                const toLabel = activity.to_location_name ?? undefined;
                const productName =
                  activity.product_name ||
                  (!activity.product_id &&
                  activity.quantity > 1 &&
                  (activity.inventory_action === 'MOVE' ||
                    activity.inventory_action === 'DONATED' ||
                    activity.inventory_action === 'DISCARD')
                    ? 'Entire Pallet'
                    : 'Unknown item');
                const isUndoable =
                  activity.inventory_action === 'MOVE' || activity.inventory_action === 'ADD';

                return (
                  <Box key={activity.id} sx={activityLogStyles.activityItem}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {productName}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: ACTION_COLORS[activity.inventory_action] || '#666' }}
                      >
                        {activity.inventory_action} (x{activity.quantity})
                      </Typography>
                      {(fromLabel || toLabel) && (
                        <Typography variant="caption" color="text.secondary">
                          {fromLabel && toLabel
                            ? `${fromLabel} → ${toLabel}`
                            : toLabel
                              ? `→ ${toLabel}`
                              : ''}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                          {activity.performed_at ? formatTimestamp(activity.performed_at) : ''}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        flexDirection: 'row',
                        ml: 2,
                        flexShrink: 0,
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label={`Undo ${activity.inventory_action.toLowerCase()} for ${productName}`}
                        onClick={() => handleUndoClick(activity)}
                        disabled={!isUndoable || undoingId === activity.id}
                      >
                        {undoingId === activity.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <UndoIcon fontSize="small" />
                        )}
                      </IconButton>
                      {(activity.inventory_action === 'ADD' ||
                        activity.inventory_action === 'MOVE') && (
                        <IconButton
                          size="small"
                          aria-label={`Edit ${activity.inventory_action.toLowerCase()} for ${productName}`}
                          onClick={() => handleEditClick(activity)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                );
              })}
              {activities.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No activity yet.
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="text"
              sx={{
                color: 'black',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
              aria-label="View all activities"
              onClick={() => navigate('/activity-log')}
            >
              View All Activities →
            </Button>
          </Box>
        </CardContent>
      </Card>

      {editingMovement && editingMovement.inventory_action === 'ADD' && editingMovement.product_id && (
        <EditAddDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={{ ...editingMovement, product_id: editingMovement.product_id }}
          onSuccess={handleEditSuccess}
        />
      )}

      {editingMovement && editingMovement.inventory_action === 'MOVE' && editingMovement.product_id && (
        <EditMoveDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={{ ...editingMovement, product_id: editingMovement.product_id }}
          onSuccess={handleEditSuccess}
        />
      )}

      <Snackbar
        open={showSuccessAlert}
        autoHideDuration={4000}
        onClose={() => setShowSuccessAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccessAlert(false)} severity="success" variant="filled">
          Edit applied successfully
        </Alert>
      </Snackbar>

      <Snackbar
        open={undoSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setUndoSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setUndoSnackbar(prev => ({ ...prev, open: false }))}
          severity={undoSnackbar.severity}
          sx={{ width: '100%' }}
        >
          {undoSnackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={undoConfirmDialog.open}
        onClose={() => setUndoConfirmDialog({ open: false, activity: null })}
      >
        <DialogTitle>Confirm Undo</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Undo this {undoConfirmDialog.activity?.inventory_action} for{' '}
            {undoConfirmDialog.activity?.product_name || 'this item'}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoConfirmDialog({ open: false, activity: null })}>
            Cancel
          </Button>
          <Button onClick={handleUndoConfirm} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
