import { Card, CardContent, Typography, Box, IconButton, Button } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import EditIcon from '@mui/icons-material/Edit';
import { activityLogStyles } from './ActivityLog.styles';

interface Activity {
  id: string;
  action: string;
  item: string;
  from?: string;
  to?: string;
  user: string;
  timestamp: string;
  color: string;
}

export default function ActivityLog() {
  const activities: Activity[] = [
    {
      id: '1',
      action: 'Move',
      item: 'Crayons Box (24ct)',
      from: '??',
      to: '??',
      user: 'John Smith',
      timestamp: 'A few seconds ago',
      color: '#2196f3',
    },
    {
      id: '2',
      action: 'Remove',
      item: 'Pencil Box (12ct)',
      from: 'Fixture A',
      to: 'Fixture F',
      user: 'John Smith',
      timestamp: '2 min ago',
      color: '#f44336',
    },
    {
      id: '3',
      action: 'Add',
      item: 'Pencil Box (12ct)',
      from: 'Fixture A',
      to: 'Fixture F',
      user: 'John Smith',
      timestamp: 'Nov 9 2025, 10:14 AM',
      color: '#4caf50',
    },
  ];

  return (
    <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Activity Log
        </Typography>

        <Box sx={activityLogStyles.activitiesContainer}>
          {activities.map((activity) => (
            <Box key={activity.id} sx={activityLogStyles.activityItem}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {activity.item}
                </Typography>
                <Typography variant="body2" sx={{ color: activity.color }}>
                  {activity.action}
                </Typography>
                {activity.from && activity.to && (
                  <Typography variant="caption" color="text.secondary">
                    {activity.from} → {activity.to}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {activity.user}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {activity.timestamp}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'row', ml: 2, flexShrink: 0 }}>
                <IconButton
                  size="small"
                  aria-label={`Undo ${activity.action.toLowerCase()} for ${activity.item}`}
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`Edit ${activity.action.toLowerCase()} for ${activity.item}`}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>

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
          >
            View All Activities →
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
