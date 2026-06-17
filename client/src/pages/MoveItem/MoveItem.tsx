import { useState } from 'react';
import { Container, Typography, Paper, Alert, Box, LinearProgress } from '@mui/material';
import {
  BulkOperationProgress,
  getItemsByLocation,
  moveItemsWithMovement,
} from '../../api/moveItem';
import MoveItemForm, { MoveItemFormData } from '../../components/MoveItemForm/MoveItemForm';
import PalletMoveForm, { PalletMoveFormData } from '../../components/PalletMoveForm/PalletMoveForm';
import FormModeToggle, { FormMode } from '../../components/FormModeToggle/FormModeToggle';
import { useAuth } from '../../context/AuthContext';
export default function MoveItem() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [mode, setMode] = useState<FormMode>('individual');
  const [bulkProgress, setBulkProgress] = useState<BulkOperationProgress | null>(null);

  const handleSubmit = async (data: MoveItemFormData) => {
    const { sourceSlot, itemGroup, destinationLocationId, quantity, notes } = data;

    setError('');
    setSuccess('');

    try {
      const itemsInSlot = await getItemsByLocation(sourceSlot.id);

      const itemsInGroup = itemsInSlot.filter(
        (item) =>
          item.warehouse === itemGroup.warehouse &&
          item.current_location_id === itemGroup.current_location_id &&
          item.name === itemGroup.name
      );

      const itemsToMove = itemsInGroup
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, quantity);

      if (itemsToMove.length !== quantity) {
        throw new Error('Insufficient items in group to move');
      }

      const result = await moveItemsWithMovement({
        item_ids: itemsToMove.map((item) => item.id),
        movement: {
          inventory_action: 'MOVE',
          from_location_id: sourceSlot.id,
          to_location_id: destinationLocationId,
          quantity,
          performed_by: user!.id,
          note: notes || undefined,
        },
        onProgress: (progress) => setBulkProgress(progress),
      });

      if (result.undone) {
        setSuccess(`Move undone: ${result.itemCount} item(s) returned to original location. No log entry created.`);
      } else {
        setSuccess(`${quantity} item${quantity > 1 ? 's' : ''} moved successfully!`);
      }
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      console.error('Error moving item:', err);
      const errorMessage =
        err instanceof Error && err.message
          ? `Failed to move item. ${err.message}`
          : 'Failed to move item. Please check the inventory and try again.';
      setError(errorMessage);
    } finally {
      setBulkProgress(null);
    }
  };

  const handlePalletMoveSubmit = async (data: PalletMoveFormData) => {
    const { sourceSlotId, destinationLocationId, notes } = data;

    setError('');
    setSuccess('');

    try {
      const allItems = await getItemsByLocation(sourceSlotId);
      const activeItems = allItems.filter((item) => item.status === 'active');

      if (activeItems.length === 0) {
        throw new Error('No active items found in the source slot.');
      }

      const result = await moveItemsWithMovement({
        item_ids: activeItems.map((item) => item.id),
        movement: {
          inventory_action: 'MOVE',
          from_location_id: sourceSlotId,
          to_location_id: destinationLocationId,
          quantity: activeItems.length,
          performed_by: user!.id,
          note: notes || undefined,
        },
        onProgress: (progress) => setBulkProgress(progress),
      });

      if (result.undone) {
        setSuccess(`Move undone: ${result.itemCount} item(s) returned to original location. No log entry created.`);
      } else {
        setSuccess(
          `${activeItems.length} item${activeItems.length > 1 ? 's' : ''} moved successfully!`
        );
      }
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      console.error('Error moving pallet:', err);
      const errorMessage =
        err instanceof Error && err.message
          ? `Failed to move pallet. ${err.message}`
          : 'Failed to move pallet. Please check the inventory and try again.';
      setError(errorMessage);
    } finally {
      setBulkProgress(null);
    }
  };

  const handleModeChange = (newMode: FormMode) => {
    setMode(newMode);
    setFormKey((k) => k + 1);
    setError('');
    setSuccess('');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 2,
          maxWidth: 600,
          mx: 'auto',
        }}
        elevation={2}
      >
        <Typography variant="h4" sx={{ mb: 3, textAlign: 'left' }}>
          Move Item
        </Typography>
        <FormModeToggle value={mode} onChange={handleModeChange} />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {bulkProgress && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box sx={{ mb: 1, fontWeight: 500 }}>
              Moving items: {bulkProgress.processedItems}/{bulkProgress.totalItems}
            </Box>
            <LinearProgress
              variant="determinate"
              value={(bulkProgress.processedItems / bulkProgress.totalItems) * 100}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Batch {bulkProgress.batch} of {bulkProgress.totalBatches}
            </Typography>
          </Alert>
        )}

        {mode === 'individual' ? (
          <MoveItemForm
            key={formKey}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormKey((k) => k + 1);
              setError('');
              setSuccess('');
            }}
            submitLabel="Confirm Move"
          />
        ) : (
          <PalletMoveForm
            key={formKey}
            onSubmit={handlePalletMoveSubmit}
            onCancel={() => {
              setFormKey((k) => k + 1);
              setError('');
              setSuccess('');
            }}
            submitLabel="Move All Items"
          />
        )}
      </Paper>
    </Container>
  );
}
