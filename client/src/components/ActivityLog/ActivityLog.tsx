import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import EditIcon from '@mui/icons-material/Edit';
import { activityLogStyles } from './ActivityLog.styles';
import { InventoryMovement } from '../../types/InventoryMovement';
import { Product } from '../../types/Product';
import { StorageLocation } from '../../types/StorageLocation';
import { Warehouse } from '../../types/Warehouse';
import { getProducts, getStorageLocations, getInventoryMovements } from '../../api/addItem';
import { getWarehouses } from '../../api/moveItem';
import { EditAddDialog } from '../EditAddDialog/EditAddDialog';
import { EditMoveDialog } from '../EditMoveDialog/EditMoveDialog';

const ACTION_COLORS: Record<string, string> = {
  ADD: '#4caf50',
  MOVE: '#2196f3',
  CHECKOUT: '#ff9800',
  DISCARD: '#f44336',
  ADJUSTMENT: '#9c27b0',
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'A few seconds ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ActivityLog() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editingMovement, setEditingMovement] = useState<InventoryMovement | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [movementsData, productsData, locationsData, warehousesData] = await Promise.all([
          getInventoryMovements(),
          getProducts(),
          getStorageLocations(),
          getWarehouses(),
        ]);

        // Show most recent first
        const sorted = movementsData.sort((a, b) => {
          const dateA = a.performed_at ? new Date(a.performed_at).getTime() : 0;
          const dateB = b.performed_at ? new Date(b.performed_at).getTime() : 0;
          return dateB - dateA;
        });
        setMovements(sorted);
        setProducts(productsData);
        setStorageLocations(locationsData);
        setWarehouses(warehousesData);
      } catch (err) {
        console.error('Failed to load activity log data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getProductName = (productId: string): string => {
    const product = products.find((p) => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getLocationLabel = (locationId: string | null): string | undefined => {
    if (!locationId) return undefined;
    const loc = storageLocations.find((l) => l.id === locationId);
    if (!loc) return 'Unknown';
    return loc.fixture ? `${loc.slot} / ${loc.fixture}` : loc.slot;
  };

  const handleEditClick = (movement: InventoryMovement) => {
    if (movement.inventory_action === 'ADD' || movement.inventory_action === 'MOVE') {
      setEditingMovement(movement);
    }
  };

  const handleEditClose = () => {
    setEditingMovement(null);
  };

  const handleEditSuccess = async () => {
    setShowSuccessAlert(true);
    // Refresh movements after successful edit
    try {
      const movementsData = await getInventoryMovements();
      const sorted = movementsData.sort((a, b) => {
        const dateA = a.performed_at ? new Date(a.performed_at).getTime() : 0;
        const dateB = b.performed_at ? new Date(b.performed_at).getTime() : 0;
        return dateB - dateA;
      });
      setMovements(sorted);
    } catch (err) {
      console.error('Failed to refresh movements:', err);
    }
  };

  // Resolve edit dialog props from the editing movement
  const getEditDialogProps = () => {
    if (!editingMovement) return null;

    const product = products.find((p) => p.id === editingMovement.product_id);
    const location = storageLocations.find((l) => l.id === editingMovement.to_location_id);
    const warehouse = location ? warehouses.find((w) => w.id === location.warehouse_id) : null;

    if (!product || !location || !warehouse) return null;

    return {
      product,
      warehouse,
      slot: location.slot,
      fixture: location.fixture || 'None',
    };
  };

  const editDialogProps = getEditDialogProps();

  // Resolve edit move dialog props from the editing movement
  const getEditMoveDialogProps = () => {
    if (!editingMovement || editingMovement.inventory_action !== 'MOVE') return null;

    const product = products.find((p) => p.id === editingMovement.product_id);
    const sourceLocation = storageLocations.find((l) => l.id === editingMovement.from_location_id);
    const destLocation = storageLocations.find((l) => l.id === editingMovement.to_location_id);
    const warehouse = sourceLocation
      ? warehouses.find((w) => w.id === sourceLocation.warehouse_id)
      : null;

    if (!product || !sourceLocation || !destLocation || !warehouse) return null;

    return {
      warehouse,
      sourceSlot: sourceLocation,
      productName: product.name,
      destinationSlot: destLocation.slot,
      destinationFixture: destLocation.fixture || 'N/A',
    };
  };

  const editMoveDialogProps = getEditMoveDialogProps();

  // Show limited entries in the activity log
  const displayedMovements = movements.slice(0, 10);

  return (
    <>
      <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Activity Log
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={activityLogStyles.activitiesContainer}>
              {displayedMovements.map((movement) => {
                const fromLabel = getLocationLabel(movement.from_location_id);
                const toLabel = getLocationLabel(movement.to_location_id);

                return (
                  <Box key={movement.id} sx={activityLogStyles.activityItem}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {getProductName(movement.product_id)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: ACTION_COLORS[movement.inventory_action] || '#666' }}
                      >
                        {movement.inventory_action} (x{movement.quantity})
                      </Typography>
                      {(fromLabel || toLabel) && (
                        <Typography variant="caption" color="text.secondary">
                          {fromLabel && toLabel
                            ? `${fromLabel} → ${toLabel}`
                            : toLabel
                              ? `→ ${toLabel}`
                              : ''}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 4 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {movement.performed_at ? formatTimestamp(movement.performed_at) : ''}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        flexDirection: 'row',
                        ml: 2,
                        flexShrink: 0,
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label={`Undo ${movement.inventory_action.toLowerCase()} for ${getProductName(movement.product_id)}`}
                      >
                        <UndoIcon fontSize="small" />
                      </IconButton>
                      {(movement.inventory_action === 'ADD' ||
                        movement.inventory_action === 'MOVE') && (
                        <IconButton
                          size="small"
                          aria-label={`Edit ${movement.inventory_action.toLowerCase()} for ${getProductName(movement.product_id)}`}
                          onClick={() => handleEditClick(movement)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                );
              })}
              {displayedMovements.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No activity yet.
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="text"
              sx={{
                color: 'black',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
              aria-label="View all activities"
            >
              View All Activities →
            </Button>
          </Box>
        </CardContent>
      </Card>

      {editingMovement && editingMovement.inventory_action === 'ADD' && editDialogProps && (
        <EditAddDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={editingMovement}
          product={editDialogProps.product}
          warehouse={editDialogProps.warehouse}
          slot={editDialogProps.slot}
          fixture={editDialogProps.fixture}
          onSuccess={handleEditSuccess}
        />
      )}

      {editingMovement && editingMovement.inventory_action === 'MOVE' && editMoveDialogProps && (
        <EditMoveDialog
          open={!!editingMovement}
          onClose={handleEditClose}
          movement={editingMovement}
          warehouse={editMoveDialogProps.warehouse}
          sourceSlot={editMoveDialogProps.sourceSlot}
          productName={editMoveDialogProps.productName}
          destinationSlot={editMoveDialogProps.destinationSlot}
          destinationFixture={editMoveDialogProps.destinationFixture}
          onSuccess={handleEditSuccess}
        />
      )}

      <Snackbar
        open={showSuccessAlert}
        autoHideDuration={4000}
        onClose={() => setShowSuccessAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccessAlert(false)} severity="success" variant="filled">
          Movement updated successfully
        </Alert>
      </Snackbar>
    </>
  );
}
