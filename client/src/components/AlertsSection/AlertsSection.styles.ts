import { SxProps, Theme } from '@mui/material';

export const alertsSectionStyles: Record<string, SxProps<Theme>> = {
  card: {
    bgcolor: '#fff5d9',
    boxShadow: 1,
    borderRadius: 2,
    p: 1,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 2.5,
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1.5,
  },

  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    p: 1.5,
    borderRadius: 2,
    bgcolor: 'white',
    border: '1px solid #d0d0d0',
    '&:hover': {
      bgcolor: '#f9f9f9',
    },
  },
};
