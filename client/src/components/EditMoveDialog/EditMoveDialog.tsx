import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MoveItemForm, { MoveItemFormData } from '../MoveItemForm/MoveItemForm';
import { editMoveMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { ItemGroup } from '../../types/Item';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';

interface EditMoveDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  warehouse: Warehouse;
  sourceSlot: StorageLocation;
  productName: string;
  destinationSlot: string;
  destinationFixture: string;
  onSuccess?: () => void;
}

export function EditMoveDialog({
  open,
  onClose,
  movement,
  warehouse,
  sourceSlot,
  productName,
  destinationSlot,
  destinationFixture,
  onSuccess,
}: EditMoveDialogProps) {
  const [error, setError] = useState('');

  // Simulate post-undo state: adjust item group quantities based on what
  // the undo of the original movement would do to item locations
  const adjustItemGroups = (groups: ItemGroup[], sourceSlotId: string): ItemGroup[] => {
    const adjusted = groups.map((g) => ({ ...g }));

    if (sourceSlotId === movement.from_location_id) {
      // Undo returns items TO the original source → increase quantity
      const match = adjusted.find((g) => g.product_id === movement.product_id);
      if (match) {
        match.quantity += movement.quantity;
      } else {
        // Group doesn't exist yet (all items of this product were moved away)
        adjusted.push({
          current_location_id: sourceSlotId,
          warehouse: warehouse.id,
          name: productName,
          product_id: movement.product_id,
          quantity: movement.quantity,
        });
      }
    } else if (sourceSlotId === movement.to_location_id) {
      // Undo removes items FROM the original destination → decrease quantity
      const match = adjusted.find((g) => g.product_id === movement.product_id);
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
    setError('');

    try {
      await editMoveMovementTransaction(movement.id!, {
        from_location_id: data.sourceSlot.id,
        to_location_id: data.destinationLocationId,
        product_id: data.itemGroup.product_id,
        quantity: data.quantity,
        performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID from auth context
        note: data.notes || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      setError(message);
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <MoveItemForm
          initialWarehouse={warehouse}
          initialSourceSlot={sourceSlot}
          initialProductId={movement.product_id}
          initialDestinationSlot={destinationSlot}
          initialDestinationFixture={destinationFixture}
          initialQuantity={movement.quantity}
          initialNotes={movement.note || ''}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save Changes"
          adjustItemGroups={adjustItemGroups}
        />
      </DialogContent>
    </Dialog>
  );
}
