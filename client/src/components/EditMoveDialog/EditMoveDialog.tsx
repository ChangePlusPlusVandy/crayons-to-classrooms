import { useState, useEffect } from 'react';
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
import MoveItemForm, { MoveItemFormData } from '../MoveItemForm/MoveItemForm';
import { editMoveMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { ItemGroup } from '../../types/Item';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { getStorageLocationById, getWarehouseById } from '../../api/addItem';
import { getItemById } from '../../api/items';
import { supabase } from '../../supabaseClient';

interface EditMoveDialogProps {
  open: boolean;
  onClose: () => void;
  movement: Omit<InventoryMovement, 'product_id'> & { product_id: string };
  onSuccess?: () => void;
}

export function EditMoveDialog({ open, onClose, movement, onSuccess }: EditMoveDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [destinationWarehouse, setDestinationWarehouse] = useState<Warehouse | null>(null);
  const [sourceSlot, setSourceSlot] = useState<StorageLocation | null>(null);
  const [productName, setProductName] = useState('');
  const [itemValue, setItemValue] = useState(0);
  const [destinationSlot, setDestinationSlot] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError('');

    async function fetchData() {
      try {
        if (!movement.product_id || !movement.from_location_id || !movement.to_location_id) {
          setFetchError('Cannot edit: movement is missing product or location');
          return;
        }
        const [src, dest, itemRow] = await Promise.all([
          getStorageLocationById(movement.from_location_id!),
          getStorageLocationById(movement.to_location_id!),
          getItemById(movement.item_id),
        ]);
        const [wh, destWh] = await Promise.all([
          getWarehouseById(src.warehouse_id),
          getWarehouseById(dest.warehouse_id),
        ]);
        setWarehouse(wh);
        setDestinationWarehouse(destWh);
        setSourceSlot(src);
        setProductName(itemRow.name);
        setItemValue(typeof itemRow.value === 'number' ? itemRow.value : 0);
        setDestinationSlot(dest.slot);
      } catch {
        setFetchError('Failed to load movement details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    open,
    movement.item_id,
    movement.product_id,
    movement.from_location_id,
    movement.to_location_id,
  ]);

  // Simulate post-undo state: adjust item group quantities based on what
  // the undo of the original movement would do to item locations
  const adjustItemGroups = (groups: ItemGroup[], sourceSlotId: string): ItemGroup[] => {
    const adjusted = groups.map((g) => ({ ...g }));

    if (sourceSlotId === movement.from_location_id) {
      // Undo returns items TO the original source → increase quantity
      const match = adjusted.find((g) => g.name === productName);
      if (match) {
        match.quantity += movement.quantity;
      } else {
        // Group doesn't exist yet (all items of this name were moved away)
        adjusted.push({
          current_location_id: sourceSlotId,
          warehouse: warehouse!.id,
          name: productName,
          product_id: movement.product_id!,
          quantity: movement.quantity,
          value: itemValue,
        });
      }
    } else if (sourceSlotId === movement.to_location_id) {
      // Undo removes items FROM the original destination → decrease quantity
      const match = adjusted.find((g) => g.name === productName);
      if (match) {
        match.quantity = Math.max(0, match.quantity - movement.quantity);
        if (match.quantity === 0) {
          return adjusted.filter((g) => g !== match);
        }
      }
    }

    return adjusted;
  };

  const handleSubmit = async (data: MoveItemFormData) => {
    setSubmitError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('Not authenticated');

      await editMoveMovementTransaction(movement.id!, {
        from_location_id: data.sourceSlot.id,
        to_location_id: data.destinationLocationId,
        product_id: data.itemGroup.product_id,
        quantity: data.quantity,
        performed_by: userId,
        note: data.notes || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      setSubmitError(message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Move Movement
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
          <>
            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
                {submitError}
              </Alert>
            )}
            <MoveItemForm
              initialWarehouse={warehouse}
              initialDestinationWarehouse={destinationWarehouse}
              initialSourceSlot={sourceSlot}
              initialItemName={productName}
              initialDestinationSlot={destinationSlot}
              initialQuantity={movement.quantity}
              initialNotes={movement.note || ''}
              onSubmit={handleSubmit}
              onCancel={onClose}
              submitLabel="Save Changes"
              adjustItemGroups={adjustItemGroups}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
