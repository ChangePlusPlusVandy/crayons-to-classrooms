import { SxProps, Theme } from '@mui/material';

export const drawerWidth = 280;

export const sidebarStyles: Record<string, SxProps<Theme>> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    bgcolor: '#1e1e2e',
    color: 'white',
  },

  header: {
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  listItemButton: {
    mx: 1,
    borderRadius: 2,
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-selected': {
      bgcolor: 'primary.dark',
      color: 'white',
      '& .MuiListItemIcon-root': {
        color: 'primary.light',
      },
      '&:hover': {
        bgcolor: 'primary.dark',
      },
    },
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.08)',
    },
  },

  userSection: {
    p: 2,
    display: 'flex',
    alignItems: 'center',
  },
};
