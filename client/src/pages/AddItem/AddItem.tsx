import { useState } from 'react';
import { Container, Typography, Paper, Alert } from '@mui/material';
import { createItemWithMovement, bulkCreateItemsWithMovement, createProduct } from '../../api/addItem';
import AddItemForm, { AddItemFormData } from '../../components/AddItemForm/AddItemForm';
import PalletAddForm, { PalletAddFormData } from '../../components/PalletAddForm/PalletAddForm';
import FormModeToggle, { FormMode } from '../../components/FormModeToggle/FormModeToggle';
import { useAuth } from '../../context/AuthContext';
export default function AddItem() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [mode, setMode] = useState<FormMode>('individual');

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
        productName = data.newProductData.name;
        productValue = data.newProductData.value;
        productCategory = data.newProductData.category || undefined;
        productItemLimit = data.newProductData.limit;
        if (typeof data.newProductData.packSize === 'number' && data.newProductData.packSize >= 1) {
          packSize = data.newProductData.packSize;
        }

        // Create a product row so the new name appears in the product picker
        const newProduct = await createProduct({
          name: productName,
          value: productValue ?? 0,
          category: productCategory,
          item_limit: productItemLimit,
        });
        productId = newProduct.id;
      } else {
        const { itemInfo } = data;
        productId = itemInfo.product_id || undefined;
        productName = itemInfo.name;
        productValue = itemInfo.value ?? undefined;
        productCategory = itemInfo.category || undefined;
        productItemLimit = itemInfo.item_limit ?? undefined;
      }

      await createItemWithMovement({
        item: {
          name: productName,
          ...(data.isNewProduct ? {} : { item_info: data.itemInfo.id }),
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

  const handlePalletSubmit = async (data: PalletAddFormData) => {
    const { warehouse, items, notes } = data;

    setError('');
    setSuccess('');

    try {
      // Create any new subcategory products first (they need IDs before the bulk call)
      const resolvedProductIds = new Map<string, string>();
      for (const item of items) {
        if (item.isNewProduct && item.newProductData?.newSubcategoryName) {
          const key = item.newProductData.newSubcategoryName;
          if (!resolvedProductIds.has(key)) {
            const newProduct = await createProduct({ name: key, value: 0 });
            resolvedProductIds.set(key, newProduct.id);
          }
        }
      }

      // Build entries array for the bulk call
      const entries = items.map((item) => {
        let productId: string | undefined;
        let productName: string;
        let productValue: number | undefined;
        let productCategory: string | undefined;
        let productItemLimit: number | undefined;
        let packSize = 1;

        if (item.isNewProduct && item.newProductData) {
          if (item.newProductData.newSubcategoryName) {
            productId = resolvedProductIds.get(item.newProductData.newSubcategoryName);
          } else {
            productId = item.newProductData.subcategoryProductId;
          }
          productName = item.newProductData.name;
          productValue = item.newProductData.value;
          productCategory = item.newProductData.category || undefined;
          productItemLimit = item.newProductData.limit;
          if (typeof item.newProductData.packSize === 'number' && item.newProductData.packSize >= 1) {
            packSize = item.newProductData.packSize;
          }
        } else {
          const { itemInfo } = item;
          productId = itemInfo.product_id || undefined;
          productName = itemInfo.name;
          productValue = itemInfo.value ?? undefined;
          productCategory = itemInfo.category || undefined;
          productItemLimit = itemInfo.item_limit ?? undefined;
        }

        return {
          item: {
            name: productName,
            ...(!item.isNewProduct && item.itemInfo.id ? { item_info: item.itemInfo.id } : {}),
            product_id: productId,
            quantity: packSize,
            stock: packSize,
            current_location_id: item.destinationLocationId,
            status: 'active' as const,
            created_by: user!.id,
            warehouse: warehouse.id,
            category: productCategory,
            item_limit: productItemLimit,
            value: productValue,
            limbo: false,
            notes: notes || undefined,
          },
          movement: {
            inventory_action: 'ADD' as const,
            from_location_id: null,
            to_location_id: item.destinationLocationId,
            quantity: item.quantity,
            performed_by: user!.id,
            note: notes || undefined,
          },
        };
      });

      await bulkCreateItemsWithMovement({ entries });

      const totalCreated = items.reduce((sum, item) => sum + item.quantity, 0);
      setSuccess(`${totalCreated} item${totalCreated > 1 ? 's' : ''} added successfully!`);
      setFormKey((k) => k + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add pallet items. Please try again.';
      setError(message);
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
          Add Item
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
        {mode === 'individual' ? (
          <AddItemForm
            key={formKey}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormKey((k) => k + 1);
              setError('');
              setSuccess('');
            }}
            submitLabel="Add Item"
          />
        ) : (
          <PalletAddForm
            key={formKey}
            onSubmit={handlePalletSubmit}
            onCancel={() => {
              setFormKey((k) => k + 1);
              setError('');
              setSuccess('');
            }}
            submitLabel="Add Pallet"
          />
        )}
      </Paper>
    </Container>
  );
}
