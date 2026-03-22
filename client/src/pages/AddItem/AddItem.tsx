import { useState } from 'react';
import { Container, Typography, Paper, Alert } from '@mui/material';
import { createItemWithMovement } from '../../api/addItem';
import AddItemForm, { AddItemFormData } from '../../components/AddItemForm/AddItemForm';
import { useAuth } from '../../context/AuthContext';

export default function AddItem() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (data: AddItemFormData) => {
    const { warehouse, destinationLocationId, quantity, notes } = data;

    setError('');
    setSuccess('');

    try {
      let productId: string | undefined;
      let productName: string;
      let productValue: number | undefined;
      let productCategory: string | undefined;
      let productItemLimit: number | undefined;
      let packSize = 1;

      if (data.isNewProduct && data.newProductData) {
        productId = data.newProductData.subcategoryProductId;
        productName = data.newProductData.name;
        productValue = data.newProductData.value;
        productCategory = data.newProductData.category || undefined;
        productItemLimit = data.newProductData.limit;
        if (typeof data.newProductData.packSize === 'number' && data.newProductData.packSize >= 1) {
          packSize = data.newProductData.packSize;
        }
      } else {
        const { product } = data;
        productId = product.id;
        productName = product.name;
        productValue = product.value;
        productCategory = product.category || undefined;
        productItemLimit =
          typeof product.item_limit === 'string'
            ? parseInt(product.item_limit, 10)
            : product.item_limit;
      }

      await createItemWithMovement({
        item: {
          name: productName,
          product_id: productId,
          quantity: packSize,
          stock: packSize,
          current_location_id: destinationLocationId,
          status: 'active',
          created_by: user!.id,
          warehouse: warehouse.id,
          category: productCategory,
          item_limit: productItemLimit || undefined,
          value: productValue,
          limbo: false,
          notes: notes || undefined,
        },
        movement: {
          inventory_action: 'ADD',
          from_location_id: null,
          to_location_id: destinationLocationId,
          quantity: quantity,
          performed_by: user!.id,
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
