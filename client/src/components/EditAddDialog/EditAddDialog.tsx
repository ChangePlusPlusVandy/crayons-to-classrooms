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
import AddItemForm, { AddItemFormData } from '../AddItemForm/AddItemForm';
import { editAddMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { Product } from '../../types/Product';
import { Warehouse } from '../../types/Warehouse';
import { getProductById, getStorageLocationById, getWarehouseById } from '../../api/addItem';
import { useAuth } from '../../context/AuthContext';

interface EditAddDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  onSuccess?: () => void;
}

export function EditAddDialog({ open, onClose, movement, onSuccess }: EditAddDialogProps) {
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [slot, setSlot] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError('');

    async function fetchData() {
      try {
        const [prod, location] = await Promise.all([
          getProductById(movement.product_id),
          getStorageLocationById(movement.to_location_id!),
        ]);
        const wh = await getWarehouseById(location.warehouse_id);
        setProduct(prod);
        setWarehouse(wh);
        setSlot(location.slot);
      } catch {
        setFetchError('Failed to load movement details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, movement.product_id, movement.to_location_id]);

  const handleSubmit = async (data: AddItemFormData) => {
    const itemLimit =
      typeof data.product.item_limit === 'string'
        ? parseInt(data.product.item_limit, 10)
        : data.product.item_limit;

    setSubmitError('');

    try {
      await editAddMovementTransaction(movement.id!, {
        item: {
          name: data.product.name,
          product_id: data.product.id,
          quantity: 1,
          stock: 1,
          current_location_id: data.destinationLocationId,
          status: 'active',
          created_by: user!.id,
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
          performed_by: user!.id,
          note: data.notes || undefined,
        },
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
        Edit Add Movement
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
            <AddItemForm
              initialWarehouse={warehouse}
              initialProduct={product}
              initialSlot={slot}
              initialQuantity={movement.quantity}
              initialNotes={movement.note || ''}
              onSubmit={handleSubmit}
              onCancel={onClose}
              submitLabel="Save Changes"
              allowNewItem={false}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
