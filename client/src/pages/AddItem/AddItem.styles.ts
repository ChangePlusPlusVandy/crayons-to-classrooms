import { styled, Box, Typography, FormLabel } from '@mui/material';

export const FormField = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const AddItemFormLabel = styled(FormLabel)(({ theme }) => ({
  textAlign: 'left',
  marginBottom: theme.spacing(1),
  fontWeight: 500,
}));

// Vertical container for option content
export const ProductOptionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  width: '100%',
}));

// Product name text (primary)
export const ProductNameText = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '0.95rem',
  color: theme.palette.text.primary,
}));

// Product details text (secondary)
export const ProductDetailsText = styled(Typography)(({ theme }) => ({
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
