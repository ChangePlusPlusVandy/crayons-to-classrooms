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
import {
  getLocationCodeContents,
  LocationCodeContents,
} from '../../api/storageLocation';

interface LocationCodeDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  locationId: string | null;
}

export function LocationCodeDetailsDialog({
  open,
  onClose,
  locationId,
}: LocationCodeDetailsDialogProps) {
  const [contents, setContents] = useState<LocationCodeContents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !locationId) {
      setContents(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getLocationCodeContents(locationId)
      .then(setContents)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load location contents')
      )
      .finally(() => setLoading(false));
  }, [open, locationId]);

  const items = contents?.items ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {contents ? `Location ${contents.location_code}` : 'Location Contents'}
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Items currently at this location
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && items.length === 0 && (
          <Alert severity="info">This location is empty.</Alert>
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
