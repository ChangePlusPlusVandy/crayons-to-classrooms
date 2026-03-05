import { useState } from 'react';
import { Container, Typography, Paper, Alert } from '@mui/material';
import { createItemWithMovement } from '../../api/addItem';
import AddItemForm, { AddItemFormData } from '../../components/AddItemForm/AddItemForm';

export default function AddItem() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (data: AddItemFormData) => {
    const { warehouse, product, destinationLocationId, quantity, notes } = data;

    setError('');
    setSuccess('');

    const itemLimit =
      typeof product.item_limit === 'string'
        ? parseInt(product.item_limit, 10)
        : product.item_limit;

    try {
      await createItemWithMovement({
        item: {
          name: product.name,
          product_id: product.id,
          quantity: 1,
          stock: 1,
          current_location_id: destinationLocationId,
          status: 'active',
          created_by: '3c53c4e6-dc90-4db4-b75b-a793fa454631', // TODO: Get user ID from auth context
          warehouse: warehouse.id,
          category: product.category || undefined,
          item_limit: itemLimit || undefined,
          value: product.value,
          limbo: false,
          notes: notes || undefined,
        },
        movement: {
          inventory_action: 'ADD',
          from_location_id: null,
          to_location_id: destinationLocationId,
          quantity: quantity,
          performed_by: '3c53c4e6-dc90-4db4-b75b-a793fa454631', // TODO: Get user ID from auth context
          note: notes || undefined,
        },
      });
      setSuccess(`${quantity} item${quantity > 1 ? 's' : ''} added successfully!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item. Please try again.';
      setError(message);
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
          Add Item
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
        <AddItemForm
          key={formKey}
          onSubmit={handleSubmit}
          onCancel={() => {
            // Remount to clear form
            setFormKey((k) => k + 1);
            setError('');
            setSuccess('');
          }}
          submitLabel="Add Item"
        />
      </Paper>
    </Container>
  );
}
