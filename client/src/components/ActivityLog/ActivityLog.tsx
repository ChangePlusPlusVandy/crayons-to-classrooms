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
import VisibilityIcon from '@mui/icons-material/Visibility';
import { activityLogStyles } from './ActivityLog.styles';
import { getActivities, ActivityDisplay } from '../../api/activities';
import { isPalletOperation } from '../../api/palletUtils';
import { undoInventoryMovement, undoGroupedInventoryMovement } from '../../api/moveItem';
import { EditAddDialog } from '../EditAddDialog/EditAddDialog';
import { EditMoveDialog } from '../EditMoveDialog/EditMoveDialog';
import { EditPalletMoveDialog } from '../EditPalletMoveDialog/EditPalletMoveDialog';
import { EditRemoveDialog } from '../EditRemoveDialog/EditRemoveDialog';
import { EditPalletRemoveDialog } from '../EditPalletRemoveDialog/EditPalletRemoveDialog';
import { PalletDetailsDialog } from '../PalletDetailsDialog/PalletDetailsDialog';

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
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [undoConfirmDialog, setUndoConfirmDialog] = useState<{
    open: boolean;
    activity: ActivityDisplay | null;
  }>({
    open: false,
    activity: null,
  });
  const [palletDetailsDialog, setPalletDetailsDialog] = useState<{
    open: boolean;
    movementId: string;
    locationName: string | null;
    action: string;
  }>({ open: false, movementId: '', locationName: null, action: '' });

  const handleViewPalletDetails = (activity: ActivityDisplay) => {
    setPalletDetailsDialog({
      open: true,
      movementId: activity.id,
      locationName: activity.from_location_name,
      action: activity.inventory_action,
    });
  };

  const fetchActivities = async () => {
    try {
      const data = await getActivities(1, PAGE_SIZE);
      setActivities(data.data);
    } catch (err) {
      console.error('Failed to load activity log data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleUndoClick = (activity: ActivityDisplay) => {
    if (!activity.id) {
      setSnackbar({
        open: true,
        message: 'Cannot undo: activity ID is missing',
        severity: 'error',
      });
      return;
    }

    if (
      activity.inventory_action !== 'MOVE' &&
      activity.inventory_action !== 'ADD' &&
      activity.inventory_action !== 'DONATED' &&
      activity.inventory_action !== 'DISCARD'
    ) {
      setSnackbar({
        open: true,
        message: `Cannot undo ${activity.inventory_action} actions. Only MOVE, ADD, DONATED, and DISCARD can be undone.`,
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
      if (activity.is_grouped_operation) {
        await undoGroupedInventoryMovement(activity.id);
      } else {
        await undoInventoryMovement(activity.id);
      }
      setSnackbar({
        open: true,
        message: `Successfully undid ${activity.inventory_action} for ${activity.product_name || 'item'}`,
        severity: 'success',
      });
      await fetchActivities();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to undo movement',
        severity: 'error',
      });
    } finally {
      setUndoingId(null);
    }
  };

  const handleUndoCancel = () => {
    setUndoConfirmDialog({ open: false, activity: null });
  };

  const handleEditClick = (activity: ActivityDisplay) => {
    if (
      activity.inventory_action === 'ADD' ||
      activity.inventory_action === 'MOVE' ||
      activity.inventory_action === 'DONATED' ||
      activity.inventory_action === 'DISCARD'
    ) {
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
                  (activity.movement_scope === 'pallet' ? 'Entire Pallet' : 'Unknown item');
                const isUndoable =
                  activity.inventory_action === 'MOVE' ||
                  activity.inventory_action === 'ADD' ||
                  activity.inventory_action === 'DONATED' ||
                  activity.inventory_action === 'DISCARD';

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
                        {activity.is_grouped_operation && activity.grouped_batch_count > 1 && (
                          <Typography variant="caption" color="text.secondary">
                            Combined {activity.grouped_batch_count} batches
                          </Typography>
                        )}
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
                      {activity.inventory_action !== 'ADD' && isPalletOperation(activity) && (
                        <IconButton
                          size="small"
                          aria-label="View pallet contents"
                          onClick={() => handleViewPalletDetails(activity)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        aria-label={`Undo ${activity.inventory_action.toLowerCase()} for ${productName}`}
                        onClick={() => handleUndoClick(activity)}
                        disabled={!isUndoable || !!undoingId}
                      >
                        {undoingId === activity.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <UndoIcon fontSize="small" />
                        )}
                      </IconButton>
                      {(activity.inventory_action === 'ADD' ||
                        activity.inventory_action === 'MOVE' ||
                        activity.inventory_action === 'DONATED' ||
                        activity.inventory_action === 'DISCARD') && (
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

      {editingMovement && editingMovement.inventory_action === 'ADD' && (
        <EditAddDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={editingMovement}
          onSuccess={handleEditSuccess}
        />
      )}

      {editingMovement &&
        editingMovement.inventory_action === 'MOVE' &&
        !isPalletOperation(editingMovement) && (
          <EditMoveDialog
            open={!!editingMovement}
            onClose={handleEditClose}
            movement={{
              ...editingMovement,
              product_id: editingMovement.product_id ?? '',
            }}
            onSuccess={handleEditSuccess}
          />
        )}

      {editingMovement &&
        editingMovement.inventory_action === 'MOVE' &&
        isPalletOperation(editingMovement) && (
          <EditPalletMoveDialog
            open={!!editingMovement}
            onClose={handleEditClose}
            movement={editingMovement}
            onSuccess={handleEditSuccess}
            isGroupedOperation={editingMovement.is_grouped_operation}
          />
        )}

      {editingMovement &&
        (editingMovement.inventory_action === 'DONATED' ||
          editingMovement.inventory_action === 'DISCARD') &&
        isPalletOperation(editingMovement) && (
          <EditPalletRemoveDialog
            open={!!editingMovement}
            onClose={handleEditClose}
            movement={editingMovement}
            onSuccess={handleEditSuccess}
            isGroupedOperation={editingMovement.is_grouped_operation}
          />
        )}

      {editingMovement &&
        (editingMovement.inventory_action === 'DONATED' ||
          editingMovement.inventory_action === 'DISCARD') &&
        !isPalletOperation(editingMovement) && (
          <EditRemoveDialog
            open={!!editingMovement}
            onClose={handleEditClose}
            movement={editingMovement}
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
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <PalletDetailsDialog
        open={palletDetailsDialog.open}
        onClose={() => setPalletDetailsDialog((prev) => ({ ...prev, open: false }))}
        movementId={palletDetailsDialog.movementId}
        locationName={palletDetailsDialog.locationName}
        action={palletDetailsDialog.action}
      />

      <Dialog
        open={undoConfirmDialog.open}
        onClose={handleUndoCancel}
        aria-labelledby="undo-confirm-dialog-title"
        aria-describedby="undo-confirm-dialog-description"
      >
        <DialogTitle id="undo-confirm-dialog-title">Confirm Undo</DialogTitle>
        <DialogContent>
          <DialogContentText id="undo-confirm-dialog-description">
            Are you sure you want to undo this {undoConfirmDialog.activity?.inventory_action} action
            for {undoConfirmDialog.activity?.product_name || 'this item'}?
            {undoConfirmDialog.activity?.is_grouped_operation &&
              undoConfirmDialog.activity.grouped_batch_count > 1 &&
              ` This will undo all ${undoConfirmDialog.activity.grouped_batch_count} batches of this operation.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUndoCancel}>Cancel</Button>
          <Button onClick={handleUndoConfirm} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
