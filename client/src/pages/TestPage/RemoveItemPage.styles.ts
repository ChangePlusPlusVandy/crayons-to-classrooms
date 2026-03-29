// src/pages/RemoveItemPage/RemoveItemPage.styles.ts
import { styled, Card, FormLabel } from '@mui/material';

export const RemoveItemCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: (theme.shape.borderRadius as number) * 2,
  boxShadow: theme.shadows[1],
  maxWidth: 600,
  marginLeft: 'auto',
  marginRight: 'auto',

  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(3),
  },
}));

export const RemoveItemFormLabel = styled(FormLabel)(({ theme }) => ({
  textAlign: 'left',
  marginBottom: theme.spacing(1),
  fontWeight: '500',
}));
