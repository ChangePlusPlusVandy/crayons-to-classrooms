import { styled, Paper, Box } from '@mui/material';

export const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: (theme.shape.borderRadius as number) * 2,
  boxShadow: theme.shadows[2],
  maxWidth: 600,
  margin: '0 auto',

  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
}));

export const FormField = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const InfoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.info.light,
  color: theme.palette.info.contrastText,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
}));
