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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UndoIcon from '@mui/icons-material/Undo';
import EditIcon from '@mui/icons-material/Edit';
import { activityLogStyles } from './ActivityLog.styles';
import { getActivities, ActivityDisplay } from '../../api/activities';
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

const PAGE_SIZE = 5;

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
                const productName = activity.product_name || 'Unknown Product';

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
                      >
                        <UndoIcon fontSize="small" />
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

      {editingMovement && editingMovement.inventory_action === 'ADD' && (
        <EditAddDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={editingMovement}
          onSuccess={handleEditSuccess}
        />
      )}

      {editingMovement && editingMovement.inventory_action === 'MOVE' && (
        <EditMoveDialog
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
    </>
  );
}
