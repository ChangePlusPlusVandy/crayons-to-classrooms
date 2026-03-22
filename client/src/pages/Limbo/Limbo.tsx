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
} from '@mui/material';
import { getLimboItems, ItemInfo } from '../../api/itemInfo';
import { limboStyles } from './Limbo.styles';
import itemIcon from '../../assets/item.svg';
import clockIcon from '../../assets/clock.svg';
import upArrowIcon from '../../assets/up_arrow.svg';
import searchIcon from '../../assets/search.svg';

export default function Limbo() {
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchName, setSearchName] = useState('');
  const [updatedAfter, setUpdatedAfter] = useState<string>('');

  const [restockOpen, setRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<ItemInfo | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<number | null>(null);
  const [restockNote, setRestockNote] = useState('');
  const [restockWarehouse, setRestockWarehouse] = useState('');
  const [restockAisle, setRestockAisle] = useState('');
  const [restockFixture, setRestockFixture] = useState('');
  const [restockSlot, setRestockSlot] = useState('');

  useEffect(() => {
    async function loadLimboItems() {
      try {
        setLoading(true);
        setError('');
        const data = await getLimboItems();
        setItems(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load limbo items.');
      } finally {
        setLoading(false);
      }
    }

    loadLimboItems();
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
    setRestockAisle('');
    setRestockFixture('');
    setRestockSlot('');
    setRestockOpen(true);
  };

  const closeRestockDialog = () => {
    setRestockOpen(false);
    setRestockItem(null);
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
            <Box sx={limboStyles.restockOptionCard}>
              <Typography sx={limboStyles.restockingLabel}>Restocking:</Typography>
              <Typography sx={limboStyles.restockItemName}>{restockItem?.name ?? '-'}</Typography>
              <Typography sx={limboStyles.restockItemId}>
                ID: {restockItem?.product_id ?? '-'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Quantity to restock</Typography>
              <Box sx={limboStyles.restockFieldBox}>
                <TextField
                  variant="standard"
                  placeholder="Enter quantitiy"
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
                <TextField
                  variant="standard"
                  select
                  placeholder="Select warehouse"
                  value={restockWarehouse}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRestockWarehouse(e.target.value)
                  }
                  sx={limboStyles.restockInput}
                  InputProps={{ disableUnderline: true }}
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>
                    Select warehouse
                  </option>
                  <option value="warehouse-1">Warehouse 1</option>
                  <option value="warehouse-2">Warehouse 2</option>
                  <option value="warehouse-3">Warehouse 3</option>
                </TextField>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Aisle</Typography>
              <Box sx={limboStyles.restockFieldBox}>
                <TextField
                  variant="standard"
                  placeholder="Enter aisle"
                  value={restockAisle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRestockAisle(e.target.value)
                  }
                  sx={limboStyles.restockInput}
                  InputProps={{ disableUnderline: true }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Fixture</Typography>
              <Box sx={limboStyles.restockFieldBox}>
                <TextField
                  variant="standard"
                  select
                  placeholder="Select fixture"
                  value={restockFixture}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRestockFixture(e.target.value)
                  }
                  sx={limboStyles.restockInput}
                  InputProps={{ disableUnderline: true }}
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>
                    Select fixture
                  </option>
                  <option value="fixture-a">Fixture A</option>
                  <option value="fixture-b">Fixture B</option>
                  <option value="fixture-c">Fixture C</option>
                </TextField>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={limboStyles.restockFieldHeader}>Slot</Typography>
              <Box sx={limboStyles.restockFieldBox}>
                <TextField
                  variant="standard"
                  select
                  placeholder="Select slot"
                  value={restockSlot}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRestockSlot(e.target.value)
                  }
                  sx={limboStyles.restockInput}
                  InputProps={{
                    disableUnderline: true,
                    inputMode: 'numeric',
                  }}
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>
                    Select slot
                  </option>
                  <option value="slot-1">Slot 1</option>
                  <option value="slot-2">Slot 2</option>
                  <option value="slot-3">Slot 3</option>
                </TextField>
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
            onClick={() => {
              // TODO: hook up restock endpoint
              closeRestockDialog();
            }}
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
