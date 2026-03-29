// client/src/pages/Limbo/Limbo.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Card,
  Autocomplete,
} from '@mui/material';
import { getLimboItems, ItemInfo } from '../../api/itemInfo';
import { createItemWithMovement, getStorageLocations, getWarehouses } from '../../api/addItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { useAuth } from '../../context/AuthContext';
import { limboStyles } from './Limbo.styles';
import itemIcon from '../../assets/item.svg';
import clockIcon from '../../assets/clock.svg';
import upArrowIcon from '../../assets/up_arrow.svg';
import searchIcon from '../../assets/search.svg';

export default function Limbo() {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchName, setSearchName] = useState('');
  const [updatedAfter, setUpdatedAfter] = useState<string>('');

  const [restockOpen, setRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<ItemInfo | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<number | null>(null);
  const [restockNote, setRestockNote] = useState('');
  const [restockWarehouse, setRestockWarehouse] = useState<string>('');
  /** Location code / slot — chosen from warehouse storage locations only */
  const [restockSlotCode, setRestockSlotCode] = useState('');
  const [restockError, setRestockError] = useState('');
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  const warehouseNameOptions = useMemo(
    () => [...warehouses].map((w) => w.name).sort((a, b) => a.localeCompare(b)),
    [warehouses]
  );

  const warehouseSlotOptions = useMemo(() => {
    const w = warehouses.find((x) => x.name === restockWarehouse);
    if (!w) return [] as string[];
    const codes = new Set<string>();
    for (const loc of storageLocations) {
      if (loc.warehouse_id === w.id && loc.location_code?.trim()) {
        codes.add(loc.location_code.trim());
      }
    }
    return Array.from(codes).sort((a, b) => a.localeCompare(b));
  }, [warehouses, restockWarehouse, storageLocations]);

  /** Resolved slot string from options (exact casing) for Autocomplete value */
  const slotAutocompleteValue = useMemo(() => {
    if (!restockSlotCode.trim()) return null;
    return (
      warehouseSlotOptions.find((c) => c.toLowerCase() === restockSlotCode.trim().toLowerCase()) ??
      null
    );
  }, [restockSlotCode, warehouseSlotOptions]);

  /** After warehouse changes, drop slot if it is not valid for that warehouse */
  useEffect(() => {
    if (!restockOpen || !restockWarehouse) return;
    if (warehouseSlotOptions.length === 0) return;
    if (
      restockSlotCode &&
      !warehouseSlotOptions.some((c) => c.toLowerCase() === restockSlotCode.toLowerCase())
    ) {
      setRestockSlotCode('');
    }
  }, [restockOpen, restockWarehouse, warehouseSlotOptions, restockSlotCode]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [limboData, warehouseData, locationData] = await Promise.all([
          getLimboItems(),
          getWarehouses(),
          getStorageLocations(),
        ]);
        setItems(limboData);
        setWarehouses(warehouseData);
        setStorageLocations(locationData);
      } catch (err) {
        console.error(err);
        setError('Failed to load limbo restock data.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const name = searchName.trim().toLowerCase();
    const updatedAfterMs = updatedAfter ? new Date(updatedAfter).getTime() : null;

    return items.filter((item) => {
      const matchesName = !name || item.name.toLowerCase().includes(name);
      const itemUpdatedMs = item.time_last_updated
        ? new Date(item.time_last_updated).getTime()
        : null;
      const matchesUpdatedAfter =
        updatedAfterMs === null || (itemUpdatedMs !== null && itemUpdatedMs >= updatedAfterMs);

      return matchesName && matchesUpdatedAfter;
    });
  }, [items, searchName, updatedAfter]);

  const openRestockDialog = (item: ItemInfo) => {
    setRestockItem(item);
    setRestockQuantity(null);
    setRestockNote('');
    setRestockWarehouse('');
    setRestockSlotCode(item.last_known_location_code?.trim() ?? '');
    setRestockError('');
    setRestockOpen(true);
  };

  const closeRestockDialog = () => {
    setRestockOpen(false);
    setRestockItem(null);
    setRestockError('');
  };

  const handleRestock = async () => {
    if (!restockItem) {
      setRestockError('No item selected for restock.');
      return;
    }
    if (!user) {
      setRestockError('You must be signed in to restock.');
      return;
    }
    if (!restockWarehouse) {
      setRestockError('Please select a warehouse.');
      return;
    }
    if (!restockQuantity || restockQuantity < 1 || !Number.isInteger(restockQuantity)) {
      setRestockError('Please enter a valid whole number quantity.');
      return;
    }

    const selectedWarehouse = warehouses.find((w) => w.name === restockWarehouse);
    if (!selectedWarehouse) {
      setRestockError('Selected warehouse could not be resolved.');
      return;
    }

    const slotCode = restockSlotCode.trim();
    if (!slotCode) {
      setRestockError('Please select a slot.');
      return;
    }

    const slotInList = warehouseSlotOptions.some(
      (code) => code.toLowerCase() === slotCode.toLowerCase()
    );
    if (!slotInList) {
      setRestockError('Choose a slot from the list. New locations cannot be created from restock.');
      return;
    }

    try {
      setRestockSubmitting(true);
      setRestockError('');

      const destinationLocation = storageLocations.find(
        (loc) =>
          loc.warehouse_id === selectedWarehouse.id &&
          loc.location_code?.trim().toLowerCase() === slotCode.toLowerCase()
      );
      if (!destinationLocation) {
        setRestockError(
          'No matching storage location row for this warehouse and slot. Refresh and try again.'
        );
        return;
      }

      const unitQuantity = restockItem.quantity ?? 1;
      const parsedItemLimit =
        typeof restockItem.item_limit === 'number' && Number.isFinite(restockItem.item_limit)
          ? restockItem.item_limit
          : undefined;
      const parsedValue =
        typeof restockItem.value === 'number' && Number.isFinite(restockItem.value)
          ? restockItem.value
          : undefined;

      await createItemWithMovement({
        item: {
          name: restockItem.name,
          ...(restockItem.product_id ? { product_id: restockItem.product_id } : {}),
          quantity: unitQuantity,
          stock: unitQuantity,
          current_location_id: destinationLocation.id,
          status: 'active',
          created_by: user.id,
          warehouse: selectedWarehouse.id,
          category: restockItem.category ?? undefined,
          item_limit: parsedItemLimit,
          value: parsedValue,
          limbo: false,
          notes: restockNote || restockItem.notes || undefined,
        },
        movement: {
          inventory_action: 'ADD',
          from_location_id: null,
          to_location_id: destinationLocation.id,
          quantity: restockQuantity,
          performed_by: user.id,
          note: restockNote || undefined,
        },
      });

      const refreshed = await getLimboItems();
      setItems(refreshed);
      closeRestockDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restock item.';
      setRestockError(message);
    } finally {
      setRestockSubmitting(false);
    }
  };

  const rowsInTable = filteredItems.length;
  // Dummy metric placeholder (backend not implemented yet)
  const resolvedLast7DaysDummy = 0;

  return (
    <Container maxWidth="lg" sx={limboStyles.container}>
      <Typography variant="h4" sx={limboStyles.header}>
        Limbo Items
      </Typography>

      <Typography variant="body2" sx={limboStyles.subheader}>
        Items temporarily removed from active inventory.
      </Typography>

      {loading && (
        <Box sx={limboStyles.loading}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          {/* Metrics above searches */}
          <Box sx={limboStyles.metricsRow}>
            <Box sx={{ ...limboStyles.metricsBoxBase, ...limboStyles.metricsBoxBlue }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#1F2937',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontStyle: 'normal',
                  fontSize: 14,
                  lineHeight: '21px',
                  letterSpacing: '-0.15px',
                  width: '149.9609375px',
                  height: '21px',
                  opacity: 1,
                  overflow: 'hidden',
                }}
              >
                Total Limbo Items - {rowsInTable}
              </Typography>
            </Box>

            <Box
              sx={{
                ...limboStyles.metricsBoxBase,
                ...limboStyles.metricsBoxGreen,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#1F2937',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontStyle: 'normal',
                  fontSize: 14,
                  lineHeight: '21px',
                  letterSpacing: '-0.15px',
                  width: '149.9609375px',
                  height: '21px',
                  opacity: 1,
                  overflow: 'hidden',
                }}
              >
                Resolved (Last 7 Days) - {resolvedLast7DaysDummy}
              </Typography>
            </Box>
          </Box>

          {/* Search bars (above the table shadow) */}
          <Box sx={limboStyles.searchBlock}>
            {error && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}

            <Box sx={limboStyles.filtersRow}>
              <Box sx={limboStyles.searchNameArea}>
                <Box
                  component="img"
                  src={searchIcon}
                  alt=""
                  sx={{ width: 16, height: 16, mr: 1.5 }}
                />
                <TextField
                  label="Search by Item Name"
                  placeholder="Item name"
                  value={searchName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchName(e.target.value)
                  }
                  fullWidth
                  size="small"
                  sx={limboStyles.searchTextField}
                />
              </Box>

              <Box sx={limboStyles.searchTimeArea}>
                <TextField
                  label="Filter by Updated Time"
                  type="date"
                  value={updatedAfter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUpdatedAfter(e.target.value)
                  }
                  fullWidth
                  size="small"
                  sx={limboStyles.searchTextField}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Box>
          </Box>

          {/* Table card/shadow starts below searches */}
          <Card sx={limboStyles.card}>
            <TableContainer component={Paper} sx={limboStyles.tableContainer}>
              <Table size="small" aria-label="Limbo items table" sx={limboStyles.table}>
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={4} sx={limboStyles.tableTitleCell}>
                      <Typography sx={limboStyles.tableTitleText}>Limbo Inventory Table</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ ...limboStyles.tableHeadCell, width: 401 }}>
                      Item Name
                    </TableCell>
                    <TableCell sx={{ ...limboStyles.tableHeadCell, width: 401 }}>
                      Last Known Location
                    </TableCell>
                    <TableCell sx={{ ...limboStyles.tableHeadCell, width: 401 }}>
                      Last Updated
                    </TableCell>
                    <TableCell sx={{ ...limboStyles.tableHeadCell, width: 183 }} align="left">
                      Restock Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item, idx) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5',
                      }}
                    >
                      <TableCell sx={{ ...limboStyles.tableCell, width: 401, color: '#111827' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            component="img"
                            src={itemIcon}
                            alt=""
                            sx={{ width: 16, height: 16 }}
                          />
                          {item.name}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ ...limboStyles.tableCell, width: 401, color: '#6B7280' }}>
                        {item.last_known_location_code ?? '-'}
                      </TableCell>
                      <TableCell sx={{ ...limboStyles.tableCell, width: 401, color: '#6B7280' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            component="img"
                            src={clockIcon}
                            alt=""
                            sx={{ width: 16, height: 16 }}
                          />
                          {item.time_last_updated
                            ? new Date(item.time_last_updated).toLocaleString()
                            : '-'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ ...limboStyles.tableCell, width: 183, py: 0 }} align="left">
                        <Box
                          sx={{
                            height: '69px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                          }}
                        >
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => openRestockDialog(item)}
                            sx={limboStyles.restockButton}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box
                                component="img"
                                src={upArrowIcon}
                                alt=""
                                sx={{ width: 16, height: 16, mr: 1 }}
                              />
                              Restock
                            </Box>
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredItems.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          No limbo items found for the current filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {/* Restock Dialog */}
      <Dialog
        open={restockOpen}
        onClose={closeRestockDialog}
        maxWidth={false}
        fullWidth={false}
        slotProps={{ paper: { sx: limboStyles.restockDialogPaper } }}
      >
        <DialogContent sx={limboStyles.restockDialogContent}>
          <Box sx={limboStyles.restockDialogClose} onClick={closeRestockDialog}>
            ×
          </Box>
          <Typography sx={limboStyles.restockDialogTitle}>Restock item from limbo</Typography>

          <Box sx={limboStyles.restockOptionsBox}>
            {restockError && <Alert severity="error">{restockError}</Alert>}
            <Box sx={limboStyles.restockOptionCard}>
              <Typography sx={limboStyles.restockingLabel}>Restocking:</Typography>
              <Typography sx={limboStyles.restockItemName}>{restockItem?.name ?? '-'}</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Quantity to restock</Typography>
              <Box sx={limboStyles.restockFieldBox}>
                <TextField
                  variant="standard"
                  placeholder="Enter quantity"
                  value={restockQuantity ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setRestockQuantity(null);
                      return;
                    }
                    const n = Number(raw);
                    setRestockQuantity(Number.isFinite(n) ? n : null);
                  }}
                  sx={limboStyles.restockInput}
                  type="number"
                  InputProps={{
                    disableUnderline: true,
                    inputMode: 'numeric',
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Warehouse</Typography>
              <Box sx={limboStyles.restockFieldBox}>
                <Autocomplete
                  fullWidth
                  disabled={warehouseNameOptions.length === 0}
                  options={warehouseNameOptions}
                  value={
                    restockWarehouse !== '' && warehouseNameOptions.includes(restockWarehouse)
                      ? restockWarehouse
                      : null
                  }
                  onChange={(_, newValue) => setRestockWarehouse(newValue ?? '')}
                  getOptionLabel={(option) => option}
                  isOptionEqualToValue={(a, b) => a === b}
                  filterOptions={(opts) => opts}
                  selectOnFocus={false}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      placeholder={
                        warehouseNameOptions.length === 0 ? 'No warehouses' : 'Select warehouse'
                      }
                      sx={limboStyles.restockInput}
                      InputProps={{
                        ...params.InputProps,
                        disableUnderline: true,
                        readOnly: true,
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Slot</Typography>
              <Box sx={limboStyles.restockFieldBox}>
                <Autocomplete
                  fullWidth
                  disabled={!restockWarehouse || warehouseSlotOptions.length === 0}
                  options={warehouseSlotOptions}
                  value={slotAutocompleteValue}
                  onChange={(_, newValue) => setRestockSlotCode(newValue ?? '')}
                  getOptionLabel={(option) => option}
                  isOptionEqualToValue={(a, b) => a === b}
                  filterOptions={(opts) => opts}
                  selectOnFocus={false}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      placeholder={
                        !restockWarehouse
                          ? 'Select a warehouse first'
                          : warehouseSlotOptions.length === 0
                            ? 'No slots in this warehouse'
                            : 'Select slot'
                      }
                      sx={limboStyles.restockInput}
                      InputProps={{
                        ...params.InputProps,
                        disableUnderline: true,
                        readOnly: true,
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Notes</Typography>
              <Box sx={limboStyles.restockNotesBox}>
                <TextField
                  variant="standard"
                  placeholder="Enter notes"
                  value={restockNote}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRestockNote(e.target.value)
                  }
                  sx={limboStyles.restockInput}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end', pr: 3, pb: 2, gap: 1.5 }}>
          <Button
            onClick={closeRestockDialog}
            sx={{
              height: 36,
              width: '79.3515625px',
              textTransform: 'none',
              bgcolor: '#FFFFFF',
              color: '#0A0A0A',
              borderRadius: '10px',
              px: 2.5,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#F3F4F6',
                boxShadow: 'none',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRestock}
            disabled={restockSubmitting}
            sx={{
              ...limboStyles.restockButton,
              width: '135px',
            }}
          >
            Restock Item
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
