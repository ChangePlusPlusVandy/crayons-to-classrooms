import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddItemForm, { AddItemFormData } from '../AddItemForm/AddItemForm';
import { editAddMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { Product } from '../../types/Product';
import { Warehouse } from '../../types/Warehouse';

interface EditAddDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  product: Product;
  warehouse: Warehouse;
  slot: string;
  fixture: string;
  onSuccess?: () => void;
}

export function EditAddDialog({
  open,
  onClose,
  movement,
  product,
  warehouse,
  slot,
  fixture,
  onSuccess,
}: EditAddDialogProps) {
  const [error, setError] = useState('');

  const handleSubmit = async (data: AddItemFormData) => {
    const itemLimit =
      typeof data.product.item_limit === 'string'
        ? parseInt(data.product.item_limit, 10)
        : data.product.item_limit;

    setError('');

    try {
      await editAddMovementTransaction(movement.id!, {
        item: {
          name: data.product.name,
          product_id: data.product.id,
          quantity: 1,
          stock: 1,
          current_location_id: data.destinationLocationId,
          status: 'active',
          created_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID from auth context
          warehouse: data.warehouse.id,
          category: data.product.category || undefined,
          item_limit: itemLimit || undefined,
          value: data.product.value,
          limbo: false,
          notes: data.notes || undefined,
        },
        movement: {
          inventory_action: 'ADD',
          from_location_id: null,
          to_location_id: data.destinationLocationId,
          quantity: data.quantity,
          performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID from auth context
          note: data.notes || undefined,
        },
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
        Edit Add Movement
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
        <AddItemForm
          initialWarehouse={warehouse}
          initialProduct={product}
          initialSlot={slot}
          initialFixture={fixture}
          initialQuantity={movement.quantity}
          initialNotes={movement.note || ''}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
