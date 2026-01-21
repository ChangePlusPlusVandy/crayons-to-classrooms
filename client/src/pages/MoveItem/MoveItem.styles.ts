import { styled, Box, Typography, FormLabel } from '@mui/material';

export const FormField = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const MoveItemFormLabel = styled(FormLabel)(({ theme }) => ({
  textAlign: 'left',
  marginBottom: theme.spacing(1),
  fontWeight: 500,
}));

// Vertical container for option content
export const SourceSlotOptionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  width: '100%',
}));

// Location code text (primary)
export const LocationCodeText = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '0.95rem',
  color: theme.palette.text.primary,
}));

// Product list text (secondary)
export const ItemListText = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  color: theme.palette.text.secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

// Highlighted text span
export const HighlightedText = styled('span')(({ theme }) => ({
  fontWeight: 700,
  backgroundColor: theme.palette.action.hover,
}));
