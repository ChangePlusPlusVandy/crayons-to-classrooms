import { styled, Paper, Box, Typography, FormLabel } from '@mui/material';

export const FormField = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const MoveItemFormLabel = styled(FormLabel)(({ theme }) => ({
  textAlign: 'left',
  marginBottom: theme.spacing(1),
  fontWeight: 500,
}));
