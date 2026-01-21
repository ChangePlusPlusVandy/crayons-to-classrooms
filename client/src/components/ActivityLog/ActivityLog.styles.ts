import { SxProps, Theme } from '@mui/material';

export const activityLogStyles: Record<string, SxProps<Theme>> = {
  activitiesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },

  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    p: 2,
    borderRadius: 2,
    bgcolor: '#f5f5f5',
  },
};
