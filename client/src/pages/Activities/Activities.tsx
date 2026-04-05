import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Box,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { getActivities, ActivityDisplay } from '../../api/activities';
import { undoInventoryMovement } from '../../api/moveItem';
import { activitiesStyles } from './Activities.styles';
import undoArrow from '../../assets/undo_arrow.svg';
import modifyPen from '../../assets/modify_pen.svg';
import { EditAddDialog } from '../../components/EditAddDialog/EditAddDialog';
import { EditMoveDialog } from '../../components/EditMoveDialog/EditMoveDialog';
import { EditRemoveDialog } from '../../components/EditRemoveDialog/EditRemoveDialog';

const PAGE_SIZE = 10;

export default function Activities() {
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActivities(page, PAGE_SIZE);
      setActivities(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleUndoClick = (activity: ActivityDisplay) => {
    if (!activity.id) {
      setSnackbar({
        open: true,
        message: 'Cannot undo: activity ID is missing',
        severity: 'error',
      });
      return;
    }

    // Only MOVE and ADD can be undone
    if (activity.inventory_action !== 'MOVE' && activity.inventory_action !== 'ADD') {
      setSnackbar({
        open: true,
        message: `Cannot undo ${activity.inventory_action} actions. Only MOVE and ADD can be undone.`,
        severity: 'error',
      });
      return;
    }

    // Show confirmation dialog
    setUndoConfirmDialog({ open: true, activity });
  };

  const handleUndoConfirm = async () => {
    const activity = undoConfirmDialog.activity;
    setUndoConfirmDialog({ open: false, activity: null });

    if (!activity?.id) return;

    setUndoingId(activity.id);
    try {
      await undoInventoryMovement(activity.id);
      setSnackbar({
        open: true,
        message: `Successfully undid ${activity.inventory_action} for ${activity.product_name || 'item'}`,
        severity: 'success',
      });
      // Refresh the activities list
      fetchActivities();
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
    await fetchActivities();
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return { time: '-', date: '' };

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return { time: '-', date: '' };

    const time = date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const dateStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return { time, date: dateStr };
  };

  const formatAction = (activity: ActivityDisplay) => {
    const action = activity.inventory_action;
    const product =
      activity.product_name ||
      (!activity.product_id &&
        activity.quantity > 1 &&
        (action === 'MOVE' || action === 'DONATED' || action === 'DISCARD')
        ? 'Entire Pallet'
        : 'Unknown item');
    const from = activity.from_location_name;
    const to = activity.to_location_name;

    switch (action) {
      case 'ADD':
        return `ADD ${product} to ${to || 'Unknown Location'}`;
      case 'MOVE':
        return `MOVE ${product} from ${from || 'Unknown Location'} to ${to || 'Unknown Location'}`;
      case 'CHECKOUT':
        return `CHECKOUT ${product} from ${from || to || 'Unknown Location'}`;
      case 'DISCARD':
        return `DISCARD ${product} from ${from || to || 'Unknown Location'}`;
      case 'DONATED':
        return `DONATED ${product} from ${from || to || 'Unknown Location'}`;
      case 'ADJUSTMENT':
        return `ADJUSTMENT ${product} at ${to || from || 'Unknown Location'}`;
      default:
        return action;
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <Box sx={activitiesStyles.paginationContainer}>
        <Button
          variant="outlined"
          size="small"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          sx={activitiesStyles.paginationButton}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Previous
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            &lt;
          </Box>
        </Button>

        {pages.map((p, idx) =>
          typeof p === 'string' ? (
            <Typography key={`ellipsis-${idx}`} sx={activitiesStyles.paginationEllipsis}>
              …
            </Typography>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setPage(p)}
              sx={activitiesStyles.paginationButton}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outlined"
          size="small"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          sx={activitiesStyles.paginationButton}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Next
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            &gt;
          </Box>
        </Button>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={activitiesStyles.container}>
      <Typography variant="h4" sx={activitiesStyles.header}>
        Recent Activities
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={activitiesStyles.tableContainer}>
            <Table sx={activitiesStyles.table}>
              <TableHead sx={activitiesStyles.tableHead}>
                <TableRow>
                  <TableCell sx={activitiesStyles.tableHeadCell}>Time</TableCell>
                  <TableCell sx={activitiesStyles.tableHeadCell}>User</TableCell>
                  <TableCell sx={activitiesStyles.tableHeadCell}>Item</TableCell>
                  <TableCell sx={activitiesStyles.tableHeadCell}>Action</TableCell>
                  <TableCell sx={activitiesStyles.tableHeadCell} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={activitiesStyles.tableCell}>
                      No activities found.
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.id} sx={activitiesStyles.tableRow}>
                      <TableCell sx={activitiesStyles.tableCell}>
                        {(() => {
                          const ts = formatTimestamp(activity.performed_at || '');
                          return (
                            <>
                              <div>{ts.time}</div>
                              {ts.date && (
                                <div style={{ color: '#666', fontSize: '0.9em' }}>{ts.date}</div>
                              )}
                            </>
                          );
                        })()}
                      </TableCell>
                      <TableCell sx={activitiesStyles.tableCell}>
                        {activity.user_name ?? activity.user_email ?? 'Unknown User'}
                      </TableCell>
                      <TableCell sx={activitiesStyles.tableCell}>
                        {activity.product_name ||
                          (!activity.product_id &&
                          activity.quantity > 1 &&
                          (activity.inventory_action === 'MOVE' ||
                            activity.inventory_action === 'DONATED' ||
                            activity.inventory_action === 'DISCARD')
                            ? 'Entire Pallet'
                            : 'Unknown item')}
                      </TableCell>
                      <TableCell sx={activitiesStyles.tableCell}>
                        {formatAction(activity)}
                      </TableCell>
                      <TableCell sx={activitiesStyles.tableCell} align="right">
                        <IconButton
                          sx={activitiesStyles.actionButton}
                          onClick={() => handleUndoClick(activity)}
                          disabled={undoingId === activity.id}
                          aria-label={`Undo ${activity.inventory_action} for ${activity.product_name}`}
                        >
                          {undoingId === activity.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Box
                              component="img"
                              src={undoArrow}
                              alt="Undo"
                              sx={activitiesStyles.actionIcon}
                            />
                          )}
                        </IconButton>
                        {(activity.inventory_action === 'ADD' ||
                          activity.inventory_action === 'MOVE' ||
                          activity.inventory_action === 'DONATED' ||
                          activity.inventory_action === 'DISCARD') && (
                          <IconButton
                            sx={activitiesStyles.actionButton}
                            onClick={() => handleEditClick(activity)}
                            aria-label={`Edit ${activity.inventory_action} for ${activity.product_name}`}
                          >
                            <Box
                              component="img"
                              src={modifyPen}
                              alt="Edit"
                              sx={activitiesStyles.actionIcon}
                            />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {renderPagination()}
        </>
      )}
      {editingMovement?.inventory_action === 'ADD' && editingMovement.product_id && (
        <EditAddDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={{ ...editingMovement, product_id: editingMovement.product_id }}
          onSuccess={handleEditSuccess}
        />
      )}

      {editingMovement?.inventory_action === 'MOVE' && editingMovement.product_id && (
        <EditMoveDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={{ ...editingMovement, product_id: editingMovement.product_id }}
          onSuccess={handleEditSuccess}
        />
      )}

      {(editingMovement?.inventory_action === 'DONATED' ||
        editingMovement?.inventory_action === 'DISCARD') && (
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
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUndoCancel}>Cancel</Button>
          <Button onClick={handleUndoConfirm} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
