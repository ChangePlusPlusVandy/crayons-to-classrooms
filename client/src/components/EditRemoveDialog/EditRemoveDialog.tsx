import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Alert,
  Box,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RemoveItemForm, {
  RemoveItemFormData,
  ItemGroupWithLocation,
} from '../RemoveItemForm/RemoveItemForm';
import { editRemoveMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { Item } from '../../types/Item';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { getProductById, getStorageLocationById, getWarehouseById } from '../../api/addItem';

interface EditRemoveDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  onSuccess?: () => void;
}

export function EditRemoveDialog({ open, onClose, movement, onSuccess }: EditRemoveDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [sourceLocation, setSourceLocation] = useState<StorageLocation | null>(null);
  const [initialGroup, setInitialGroup] = useState<ItemGroupWithLocation | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError('');

    async function fetchData() {
      if (movement.from_location_id == null || movement.product_id == null) {
        setFetchError('Failed to load movement details');
        setLoading(false);
        return;
      }

      try {
        const [location, prod] = await Promise.all([
          getStorageLocationById(movement.from_location_id),
          getProductById(movement.product_id),
        ]);
        const wh = await getWarehouseById(location.warehouse_id);

        setSourceLocation(location);
        setWarehouse(wh);

        // Build a virtual group from movement data so the item name pre-populates even when
        // the removed items are inactive (and thus absent from the active items list).
        setInitialGroup({
          name: prod.name,
          locationCode: location.location_code,
          locationId: location.id,
          productId: movement.product_id,
          itemInfoId: movement.product_id,
          items: Array.from({ length: movement.quantity }, () => ({}) as Item),
        });
      } catch {
        setFetchError('Failed to load movement details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, movement.from_location_id, movement.product_id, movement.quantity]);

  const handleSubmit = async (data: RemoveItemFormData) => {
    await editRemoveMovementTransaction(movement.id!, {
      inventory_action: data.removalAction,
      from_location_id: data.fromLocationId,
      product_id: data.productId,
      quantity: data.quantity,
      performed_by: user!.id,
      note: data.notes || undefined,
    });

    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Remove Movement
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
          <RemoveItemForm
            initialWarehouse={warehouse}
            initialSourceLocation={sourceLocation}
            initialProductId={movement.product_id ?? ''}
            initialRemovalAction={(movement.inventory_action as 'DONATED' | 'DISCARD') ?? 'DONATED'}
            initialQuantity={movement.quantity}
            initialNotes={movement.note || ''}
            initialGroup={initialGroup}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel="Save Changes"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
