import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';
import { editMoveMovementTransaction, editGroupedMoveMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { getStorageLocations } from '../../api/moveItem';
import { getStorageLocationById, getWarehouseById } from '../../api/addItem';

interface EditPalletMoveDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  onSuccess?: () => void;
  isGroupedOperation?: boolean;
}

export function EditPalletMoveDialog({
  open,
  onClose,
  movement,
  onSuccess,
  isGroupedOperation,
}: EditPalletMoveDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  const [srcWarehouse, setSrcWarehouse] = useState<Warehouse | null>(null);
  const [srcSlot, setSrcSlot] = useState<string | null>(null);
  const [destWarehouse, setDestWarehouse] = useState<Warehouse | null>(null);
  const [destSlot, setDestSlot] = useState<string | null>(null);
  const [note, setNote] = useState(movement.note || '');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError('');
    setSubmitError('');
    setNote(movement.note || '');

    async function fetchData() {
      try {
        if (!movement.from_location_id || !movement.to_location_id) {
          setFetchError('Cannot edit: movement is missing location data');
          return;
        }

        const [allLocations, srcLocation, destLocation] = await Promise.all([
          getStorageLocations(),
          getStorageLocationById(movement.from_location_id),
          getStorageLocationById(movement.to_location_id),
        ]);

        setStorageLocations(allLocations);

        const [srcWh, destWh] = await Promise.all([
          getWarehouseById(srcLocation.warehouse_id),
          getWarehouseById(destLocation.warehouse_id),
        ]);

        setSrcWarehouse(srcWh);
        setSrcSlot(srcLocation.slot);
        setDestWarehouse(destWh);
        setDestSlot(destLocation.slot);
      } catch {
        setFetchError('Failed to load movement details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, movement.from_location_id, movement.to_location_id, movement.note]);

  const handleSubmit = async () => {
    if (!destWarehouse || !destSlot) return;
    if (!user) {
      setSubmitError('Not authenticated');
      return;
    }

    const matchingDest = storageLocations.find(
      (loc) => loc.warehouse_id === destWarehouse.id && loc.slot === destSlot
    );

    if (!matchingDest) {
      setSubmitError('Could not find the selected destination slot');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        from_location_id: movement.from_location_id!,
        to_location_id: matchingDest.id,
        quantity: movement.quantity,
        performed_by: user.id,
        note: note || undefined,
      };

      if (isGroupedOperation) {
        await editGroupedMoveMovementTransaction(movement.id, payload);
      } else {
        await editMoveMovementTransaction(movement.id, payload);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to save changes. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!destWarehouse && !!destSlot && !submitting;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Pallet Move
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : fetchError ? (
          <Alert severity="error">{fetchError}</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError('')}>
                {submitError}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              Quantity: {movement.quantity} items
            </Typography>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Source
              </Typography>
              <Typography variant="body1">
                {srcWarehouse?.name ?? '—'} — {srcSlot ?? '—'}
              </Typography>
            </Box>

            <WarehouseSelector
              value={destWarehouse}
              onChange={(wh) => {
                setDestWarehouse(wh);
                setDestSlot(null);
              }}
              label="Destination Warehouse"
              required
            />

            <SlotSelector
              value={destSlot}
              onChange={setDestSlot}
              warehouse={destWarehouse}
              storageLocations={storageLocations}
              label="Destination Slot"
              required
            />

            <TextField
              label="Notes"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Box>
        )}
      </DialogContent>
      {!loading && !fetchError && (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
