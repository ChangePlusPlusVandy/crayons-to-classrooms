import { useState } from 'react';
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
} from '@mui/material';
import { mockActivities, ActivityDisplay } from '../../utils/mockActivities';
import { activitiesStyles } from './Activities.styles';
import undoArrow from '../../assets/undo_arrow.svg';
import modifyPen from '../../assets/modify_pen.svg';

export default function Activities() {
  const [displayCount, setDisplayCount] = useState(10);

  const visibleActivities = mockActivities.slice(0, displayCount);
  const hasMore = displayCount < mockActivities.length;

  const handleViewMore = () => {
    setDisplayCount((prev) => Math.min(prev + 10, mockActivities.length));
  };

  const handleUndo = (activity: ActivityDisplay) => {
    console.log('Undo action for:', activity);
  };

  const handleEdit = (activity: ActivityDisplay) => {
    console.log('Edit action for:', activity);
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Unknown time';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Unknown time';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'A few seconds ago';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatAction = (activity: ActivityDisplay) => {
    const action = activity.inventory_action;

    switch (action) {
      case 'MOVE':
        return `Moved from ${activity.from_location_name} to ${activity.to_location_name}`;
      case 'ADD':
        if (activity.note) return activity.note;
        return `Added to ${activity.to_location_name}`;
      case 'CLOCKOUT':
        return activity.note || `Checked out`;
      case 'DISCARD':
        return activity.note || `Discarded`;
      case 'ADJUSTMENT':
        return activity.note || `Quantity adjusted`;
      default:
        return action;
    }
  };

  return (
    <Container sx={activitiesStyles.container}>
      <Typography variant="h4" sx={activitiesStyles.header}>
        Recent Activities
      </Typography>

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
            {visibleActivities.map((activity) => (
              <TableRow key={activity.id} sx={activitiesStyles.tableRow}>
                <TableCell sx={activitiesStyles.tableCell}>
                  {formatTimestamp(activity.performed_at || '')}
                </TableCell>
                <TableCell sx={activitiesStyles.tableCell}>{activity.user_name}</TableCell>
                <TableCell sx={activitiesStyles.tableCell}>{activity.item_name}</TableCell>
                <TableCell sx={activitiesStyles.tableCell}>{formatAction(activity)}</TableCell>
                <TableCell sx={activitiesStyles.tableCell} align="right">
                  <IconButton
                    sx={activitiesStyles.actionButton}
                    onClick={() => handleUndo(activity)}
                    aria-label={`Undo ${activity.inventory_action} for ${activity.item_name}`}
                  >
                    <Box
                      component="img"
                      src={undoArrow}
                      alt="Undo"
                      sx={activitiesStyles.actionIcon}
                    />
                  </IconButton>
                  <IconButton
                    sx={activitiesStyles.actionButton}
                    onClick={() => handleEdit(activity)}
                    aria-label={`Edit ${activity.inventory_action} for ${activity.item_name}`}
                  >
                    <Box
                      component="img"
                      src={modifyPen}
                      alt="Edit"
                      sx={activitiesStyles.actionIcon}
                    />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {hasMore && (
        <Box sx={activitiesStyles.viewMoreContainer}>
          <Button variant="outlined" sx={activitiesStyles.viewMoreButton} onClick={handleViewMore}>
            View More
          </Button>
        </Box>
      )}
    </Container>
  );
}
