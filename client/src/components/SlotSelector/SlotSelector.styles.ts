import { styled, FormLabel } from '@mui/material';

export const SlotSelectorLabel = styled(FormLabel)(({ theme }) => ({
  textAlign: 'left',
  marginBottom: theme.spacing(1),
  fontWeight: 500,
}));
