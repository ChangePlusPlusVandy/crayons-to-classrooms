import { SxProps, Theme } from '@mui/material';

export const quickActionsStyles: Record<string, SxProps<Theme>> = {
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },

  actionButton: {
    py: 1.5,
    px: 2,
    justifyContent: 'flex-start',
    textTransform: 'none',
    fontSize: '1rem',
    fontWeight: 400,
  },
};
