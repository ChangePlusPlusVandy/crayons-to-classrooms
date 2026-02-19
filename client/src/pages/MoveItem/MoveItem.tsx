import { useState } from 'react';
import { Container, Typography, Paper, Alert } from '@mui/material';
import {
  getItemsByLocation,
  createInventoryMovement,
  updateItemLocation,
} from '../../api/moveItem';
import MoveItemForm, { MoveItemFormData } from '../../components/MoveItemForm/MoveItemForm';

export default function MoveItem() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formKey, setFormKey] = useState(0);

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

      // TODO: Replace with batch update API endpoint when available
      await Promise.all(
        itemsToMove.map((item) => updateItemLocation(item.id, destinationLocationId))
      );

      // Record one inventory movement for the entire operation
      const representativeItem = itemsToMove[0];
      await createInventoryMovement({
        inventory_action: 'MOVE',
        item_id: representativeItem.id,
        product_id: representativeItem.product_id,
        from_location_id: sourceSlot.id,
        to_location_id: destinationLocationId,
        quantity,
        performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID
        note: notes || undefined,
      });

      setSuccess(`${quantity} item${quantity > 1 ? 's' : ''} moved successfully!`);
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      console.error('Error moving item:', err);
      const errorMessage =
        err instanceof Error && err.message
          ? `Failed to move item. ${err.message}`
          : 'Failed to move item. Please check the inventory and try again.';
      setError(errorMessage);
    }
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
      </Paper>
    </Container>
  );
}
