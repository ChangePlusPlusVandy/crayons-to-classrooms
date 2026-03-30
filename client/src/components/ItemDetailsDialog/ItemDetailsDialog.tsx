import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Box,
  CircularProgress,
  Typography,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  getItemInfoDetails,
  ItemInfoDetails,
  ItemInfoWarehouseLocation,
} from '../../api/itemInfo';
import { itemDetailsStyles as styles } from './ItemDetailsDialog.styles';
import { EditItemInfoDialog } from '../EditItemInfoDialog/EditItemInfoDialog';

interface ItemDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string | null;
}

export function ItemDetailsDialog({ open, onClose, itemId }: ItemDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<ItemInfoDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchDetails = () => {
    if (!itemId) return;
    setLoading(true);
    setError('');

    getItemInfoDetails(itemId)
      .then(setDetails)
      .catch(() => setError('Failed to load item details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !itemId) return;
    fetchDetails();
  }, [open, itemId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={styles.dialogTitle}>
        Item Details
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Typography sx={styles.subtitle}>
        View item details. Click &apos;Edit&apos; to modify information.
      </Typography>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : details ? (
          <>
            {/* Item name and status */}
            <Box sx={styles.section}>
              <Box sx={styles.fieldLabel}>
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                Item(s)
              </Box>
              <Typography sx={styles.fieldValue}>{details.name}</Typography>
            </Box>

            <Box sx={styles.fieldRow}>
              <Box sx={styles.fieldGroup}>
                <Box sx={styles.fieldLabel}>
                  <ViewInArOutlinedIcon sx={{ fontSize: 16 }} />
                  Status
                </Box>
                <Chip
                  label={details.in_stock ? 'In Stock' : 'Not In Inventory'}
                  size="small"
                  sx={{
                    bgcolor: details.in_stock ? '#e8f5e9' : '#f5f5f5',
                    color: details.in_stock ? '#2e7d32' : '#757575',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
              {details.category && (
                <Box sx={styles.fieldGroup}>
                  <Box sx={styles.fieldLabel}>Category</Box>
                  <Typography sx={styles.fieldValue}>{details.category}</Typography>
                </Box>
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            {/* Locations by warehouse */}
            <Box sx={styles.section}>
              <Box sx={{ ...styles.fieldLabel, mb: 1.5 }}>
                <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
                Locations
              </Box>
              {details.warehouse_locations.length === 0 ? (
                <Typography sx={styles.emptyState}>
                  No location data available
                </Typography>
              ) : (
                details.warehouse_locations.map((wh: ItemInfoWarehouseLocation) => (
                  <Box key={wh.warehouse_id} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={styles.warehouseHeader}>
                        {wh.warehouse_name}
                      </Typography>
                      <Typography sx={styles.itemCount}>
                        ({wh.item_count} {wh.item_count === 1 ? 'item' : 'items'})
                      </Typography>
                    </Box>
                    {wh.locations.length === 0 ? (
                      <Typography sx={styles.emptyState}>
                        No assigned locations
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small" sx={{ tableLayout: 'fixed', '& td, & th': { py: 0.5, px: 1 } }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: '50%' }}>Location</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: '50%' }}>Fixture</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {wh.locations.map((loc, idx) => (
                              <TableRow key={idx}>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{loc.slot}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                  {loc.fixture || 'No fixture'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          disabled={loading || !!error || !details}
          onClick={() => setEditDialogOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Edit
        </Button>
      </DialogActions>

      <EditItemInfoDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSaved={fetchDetails}
        itemInfo={details}
      />
    </Dialog>
  );
}
