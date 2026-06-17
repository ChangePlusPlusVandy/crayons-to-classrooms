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
import { Warehouse } from '../../types/Warehouse';
import { getStorageLocationById, getWarehouseById } from '../../api/addItem';
import { getItemById } from '../../api/items';
import { supabase } from '../../supabaseClient';

interface EditAddDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  onSuccess?: () => void;
}

export function EditAddDialog({ open, onClose, movement, onSuccess }: EditAddDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [initialItemInfoId, setInitialItemInfoId] = useState<string | undefined>(undefined);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [slot, setSlot] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError('');

    async function fetchData() {
      try {
        if (!movement.to_location_id || !movement.item_id) {
          setFetchError('Cannot edit: movement is missing location or item');
          return;
        }
        const [itemRow, location] = await Promise.all([
          getItemById(movement.item_id),
          getStorageLocationById(movement.to_location_id!),
        ]);
        const wh = await getWarehouseById(location.warehouse_id);
        setInitialItemInfoId(itemRow.item_info || undefined);
        setWarehouse(wh);
        setSlot(location.slot);
      } catch {
        setFetchError('Failed to load movement details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, movement.to_location_id, movement.item_id]);

  const handleSubmit = async (data: AddItemFormData) => {
    const { itemInfo } = data;
    const itemLimit = itemInfo.item_limit ?? undefined;

    setSubmitError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) throw new Error('Not authenticated');

      await editAddMovementTransaction(movement.id!, {
        item: {
          name: itemInfo.name,
          item_info: itemInfo.id,
          product_id: itemInfo.product_id || undefined,
          quantity: 1,
          stock: 1,
          current_location_id: data.destinationLocationId,
          status: 'active',
          created_by: userId,
          warehouse: data.warehouse.id,
          category: itemInfo.category || undefined,
          item_limit: itemLimit,
          value: itemInfo.value ?? 0,
          limbo: false,
          notes: data.notes || undefined,
        },
        movement: {
          inventory_action: 'ADD',
          from_location_id: null,
          to_location_id: data.destinationLocationId,
          quantity: data.quantity,
          performed_by: userId,
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
              initialItemInfoId={initialItemInfoId}
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
