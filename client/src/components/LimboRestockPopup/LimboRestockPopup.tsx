import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  MenuItem,
  Select,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getLastMovementForItem } from '../../api/inventoryMovements';
import { getStorageLocationById } from '../../api/storageLocations';
import { getProductById } from '../../api/products';
import { getAllWarehouses, Warehouse } from '../../api/warehouses';
import { LimboRestockData } from '../../types/InventoryMovement';

const inputFieldStyles = {
  borderRadius: '8px',
  bgcolor: 'white',
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#e0e0e0',
    },
  },
};

const selectFieldStyles = {
  borderRadius: '8px',
  bgcolor: 'white',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e0e0e0',
  },
};

interface LimboRestockPopupProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  onSubmit: (data: LimboRestockData) => Promise<void>;
}

export default function LimboRestockPopup({
  open,
  onClose,
  itemId,
  onSubmit,
}: LimboRestockPopupProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fixture, setFixture] = useState('');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      loadData();
    }
  }, [open, itemId]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      let warehousesData: Warehouse[] = [];
      try {
        warehousesData = await getAllWarehouses();
        setWarehouses(warehousesData);
      } catch (err) {
        console.error('Error loading warehouses:', err);

        // mock data
        warehousesData = [
          { id: 'mock-warehouse-1', name: 'Woodlawn Warehouse', address: null },
          { id: 'mock-warehouse-2', name: 'Downtown Warehouse', address: null },
        ];
        setWarehouses(warehousesData);
        setError('Using mock data. Backend API may not be available.');
      }

      let lastMovement = null;
      try {
        lastMovement = await getLastMovementForItem(itemId);
      } catch (err) {
        console.error('Error loading last movement:', err);
      }

      if (lastMovement) {
        try {
          const product = await getProductById(lastMovement.product_id);
          setProductName(product.name);
        } catch (err) {
          console.error('Error loading product:', err);
          setProductName('1-inch Screw Set');
        }

        try {
          const location = await getStorageLocationById(lastMovement.to_location_id);

          setWarehouseId(location.warehouse_id);
          setFixture(location.fixture || '');

          // Slot refers to "aisle" in database
          setSlot(location.aisle || '');

          setQuantity(lastMovement.quantity.toString());
        } catch (err) {
          console.error('Error loading location:', err);
          setQuantity(lastMovement.quantity.toString());
        }
      } else {
        setProductName('1-inch Screw Set');
        setQuantity('1');
        if (warehousesData.length > 0) {
          setWarehouseId(warehousesData[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Using default values.');
      setProductName('1-inch Screw Set');
      setQuantity('1');
      setWarehouses([{ id: 'mock-warehouse-1', name: 'Woodlawn Warehouse', address: null }]);
      setWarehouseId('mock-warehouse-1');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('Quantity must be a positive number');
      return;
    }

    if (!warehouseId) {
      setError('Please select a warehouse');
      return;
    }

    if (!fixture.trim()) {
      setError('Fixture is required');
      return;
    }

    if (!slot.trim()) {
      setError('Slot is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const restockData: LimboRestockData = {
        quantity: quantityNum,
        warehouseId,
        fixture: fixture.trim(),
        slot: slot.trim(),
        note: note.trim() || undefined,
      };

      await onSubmit(restockData);
      handleClose();
    } catch (err) {
      console.error('Error submitting restock:', err);
      setError('Failed to submit restock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setProductName('');
    setQuantity('');
    setWarehouseId('');
    setFixture('');
    setSlot('');
    setNote('');
    setError('');
    setLoading(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 0, sm: 2 },
          maxHeight: { xs: '100vh', sm: '90vh' },
          borderRadius: { xs: 0, sm: 2 },
          bgcolor: '#E8EEF3',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1, sm: 0.5 },
          pb: { xs: 2, sm: 1 },
          pt: { xs: 3, sm: 2 },
          px: { xs: 3, sm: 3 },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.25rem' },
              fontWeight: 600,
            }}
          >
            Restock Item from Limbo
          </Typography>
          {!isMobile && (
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
              size="small"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        {!loading && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
          >
            {productName} (ID: {itemId})
          </Typography>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          pt: { xs: 2, sm: 2 },
          px: { xs: 3, sm: 3 },
          pb: { xs: 3, sm: 2 },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 2.5 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}

            <Box>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Quantity to Restock
              </Typography>
              <TextField
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                fullWidth
                required
                type="number"
                variant="outlined"
                disabled={isSubmitting}
                inputProps={{ min: 1 }}
                placeholder="1"
                sx={inputFieldStyles}
              />
            </Box>

            <Box>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Warehouse
              </Typography>
              <Select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                fullWidth
                required
                disabled={isSubmitting}
                displayEmpty
                sx={selectFieldStyles}
              >
                {warehouses.map((warehouse) => (
                  <MenuItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* <Box>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Aisle
              </Typography>
              <TextField
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                fullWidth
                required
                variant="outlined"
                disabled={isSubmitting}
                placeholder="Enter aisle"
                sx={inputFieldStyles}
              />
            </Box> */}

            <Box>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Fixture
              </Typography>
              <Select
                value={fixture}
                onChange={(e) => setFixture(e.target.value)}
                fullWidth
                required
                disabled={isSubmitting}
                displayEmpty
                sx={selectFieldStyles}
              >
                <MenuItem value="">
                  <Typography sx={{ color: 'text.secondary' }}>Select fixture</Typography>
                </MenuItem>
                <MenuItem value="Shelf">Shelf</MenuItem>
                <MenuItem value="Rack">Rack</MenuItem>
                <MenuItem value="Bin">Bin</MenuItem>
                <MenuItem value="Pallet">Pallet</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Slot
              </Typography>
              <TextField
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                fullWidth
                required
                variant="outlined"
                disabled={isSubmitting}
                placeholder="Enter or select slot"
                sx={inputFieldStyles}
              />
            </Box>

            <Box>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Notes
              </Typography>
              <TextField
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
                variant="outlined"
                disabled={isSubmitting}
                multiline
                rows={3}
                placeholder="Enter notes (optional)"
                sx={inputFieldStyles}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 3, sm: 3 },
          pb: { xs: 3, sm: 2 },
          pt: { xs: 2, sm: 1 },
          gap: { xs: 2, sm: 1 },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
        }}
      >
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          fullWidth={isMobile}
          variant="outlined"
          sx={{
            borderRadius: '8px',
            order: { xs: 2, sm: 1 },
            minWidth: { sm: 100 },
            py: { xs: 1.5, sm: 1.5 },
            bgcolor: 'white',
            borderColor: '#e0e0e0',
            color: 'text.primary',
            '&:hover': {
              bgcolor: '#f5f5f5',
              borderColor: '#e0e0e0',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || isSubmitting}
          fullWidth={isMobile}
          sx={{
            borderRadius: '8px',
            order: { xs: 1, sm: 2 },
            minWidth: { sm: 120 },
            py: { xs: 1.5, sm: 1.5 },
            bgcolor: '#1a1a2e',
            '&:hover': {
              bgcolor: '#0f0f1e',
            },
          }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Restock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
