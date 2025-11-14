// src/pages/TestPage/TestPage.styles.ts
import { styled, Card } from '@mui/material';

export const TestCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: (theme.shape.borderRadius as number) * 2,

  // Mobile-first styles
  boxShadow: theme.shadows[1],

  // Add extra padding on wider screens
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(3),
  },
}));
