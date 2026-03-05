import { useState } from 'react';
import { Container, Typography, Paper, Alert } from '@mui/material';
import { getItemsByLocation, moveItemsWithMovement } from '../../api/moveItem';
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
          item.product_id === itemGroup.product_id
      );

      const itemsToMove = itemsInGroup
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, quantity);

      if (itemsToMove.length !== quantity) {
        throw new Error('Insufficient items in group to move');
      }

      await moveItemsWithMovement({
        item_ids: itemsToMove.map((item) => item.id),
        movement: {
          inventory_action: 'MOVE',
          from_location_id: sourceSlot.id,
          to_location_id: destinationLocationId,
          quantity,
          performed_by: '3c53c4e6-dc90-4db4-b75b-a793fa454631', // TODO: Get user ID
          note: notes || undefined,
        },
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
