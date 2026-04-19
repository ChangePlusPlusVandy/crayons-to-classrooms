import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getPalletItems, PalletItemSummary } from '../../api/palletItems';

interface PalletDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  movementId: string;
  locationName: string | null;
  action: string;
}

export function PalletDetailsDialog({
  open,
  onClose,
  movementId,
  locationName,
  action,
}: PalletDetailsDialogProps) {
  const [items, setItems] = useState<PalletItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getPalletItems(movementId)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load details'))
      .finally(() => setLoading(false));
  }, [open, movementId]);

  const subtitle =
    action === 'MOVE'
      ? `Moved from ${locationName ?? 'Unknown Location'}`
      : `Removed from ${locationName ?? 'Unknown Location'}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Pallet Contents
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && items.length === 0 && (
          <Alert severity="info">Item details are not available for this operation.</Alert>
        )}

        {!loading && !error && items.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Qty
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="right">{item.total_quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
