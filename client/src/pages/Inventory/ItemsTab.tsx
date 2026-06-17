import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Box,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import {
  browseItemsInfo,
  getItemInfoAll,
  getItemInfoCategories,
  ItemInfoBrowseItem,
} from '../../api/itemInfo';
import { Warehouse } from '../../types/Warehouse';
import { ItemDetailsDialog } from '../../components/ItemDetailsDialog/ItemDetailsDialog';
import { inventoryStyles } from './Inventory.styles';

const PAGE_SIZE = 10;

interface ItemsTabProps {
  active: boolean;
  warehouseFilter: string;
  warehouses: Warehouse[];
  onWarehouseChange: (value: string) => void;
}

export function ItemsTab({
  active,
  warehouseFilter,
  warehouses,
  onWarehouseChange,
}: ItemsTabProps) {
  const navigate = useNavigate();

  const [items, setItems] = useState<ItemInfoBrowseItem[]>([]);
  const [itemTotal, setItemTotal] = useState(0);
  const [itemPage, setItemPage] = useState(1);
  const [itemLoading, setItemLoading] = useState(true);
  const [itemError, setItemError] = useState<string | null>(null);

  const [itemSearchInput, setItemSearchInput] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fixtureFilter, setFixtureFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [fixtures, setFixtures] = useState<string[]>([]);
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);

  const itemDebounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getItemInfoCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getItemInfoAll()
      .then((items) => {
        const uniqueFixtures = Array.from(
          new Set(
            items
              .map((item) => item.fixture?.trim())
              .filter((fixture): fixture is string => !!fixture)
          )
        ).sort((a, b) => a.localeCompare(b));
        setFixtures(uniqueFixtures);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    itemDebounceTimer.current = setTimeout(() => {
      setItemSearch(itemSearchInput);
      setItemPage(1);
    }, 300);
    return () => clearTimeout(itemDebounceTimer.current);
  }, [itemSearchInput]);

  useEffect(() => {
    setItemPage(1);
  }, [warehouseFilter]);

  useEffect(() => {
    setItemPage(1);
  }, [fixtureFilter]);

  const fetchItems = useCallback(async () => {
    setItemLoading(true);
    setItemError(null);
    try {
      const result = await browseItemsInfo({
        page: itemPage,
        limit: PAGE_SIZE,
        search: itemSearch || undefined,
        warehouse: warehouseFilter || undefined,
        category: categoryFilter || undefined,
        fixture: fixtureFilter || undefined,
        stock_status: (stockStatusFilter as 'in_stock' | 'out_of_stock') || undefined,
      });
      setItems(result.data);
      setItemTotal(result.total);
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setItemLoading(false);
    }
  }, [itemPage, itemSearch, warehouseFilter, categoryFilter, fixtureFilter, stockStatusFilter]);

  useEffect(() => {
    if (active) fetchItems();
  }, [active, fetchItems]);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {itemError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {itemError}
        </Alert>
      )}

      <Box sx={inventoryStyles.filterBar}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by item name..."
          value={itemSearchInput}
          onChange={(e) => setItemSearchInput(e.target.value)}
          sx={inventoryStyles.searchField}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={inventoryStyles.filtersRow}>
          <FilterListIcon color="action" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Filters:
          </Typography>

          <FormControl size="small" sx={inventoryStyles.filterSelect}>
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={warehouseFilter}
              label="Warehouse"
              onChange={(e) => onWarehouseChange(e.target.value)}
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={inventoryStyles.filterSelect}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setItemPage(1);
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={inventoryStyles.filterSelect}>
            <InputLabel>Fixture</InputLabel>
            <Select
              value={fixtureFilter}
              label="Fixture"
              onChange={(e) => {
                setFixtureFilter(e.target.value);
                setItemPage(1);
              }}
            >
              <MenuItem value="">All Fixtures</MenuItem>
              {fixtures.map((fixture) => (
                <MenuItem key={fixture} value={fixture}>
                  {fixture}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={inventoryStyles.filterSelect}>
            <InputLabel>Status</InputLabel>
            <Select
              value={stockStatusFilter}
              label="Status"
              onChange={(e) => {
                setStockStatusFilter(e.target.value);
                setItemPage(1);
              }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="in_stock">In Stock</MenuItem>
              <MenuItem value="out_of_stock">Not In Inventory</MenuItem>
            </Select>
          </FormControl>

          <Typography sx={inventoryStyles.itemCount}>
            Showing {items.length} of {itemTotal} items
          </Typography>
        </Box>
      </Box>

      {itemLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={inventoryStyles.tableContainer}>
            <Table size="small" sx={inventoryStyles.table}>
              <TableHead sx={inventoryStyles.tableHead}>
                <TableRow>
                  <TableCell sx={inventoryStyles.tableHeadCell}>Item(s)</TableCell>
                  <TableCell sx={inventoryStyles.tableHeadCell}>Status</TableCell>
                  <TableCell sx={inventoryStyles.tableHeadCell} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={inventoryStyles.tableCell}>
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} sx={inventoryStyles.tableRow}>
                      <TableCell sx={inventoryStyles.tableCell}>{item.name}</TableCell>
                      <TableCell sx={inventoryStyles.tableCell}>
                        <Chip
                          label={item.in_stock ? 'In Stock' : 'Not In Inventory'}
                          size="small"
                          sx={{
                            bgcolor: item.in_stock ? '#e8f5e9' : '#f5f5f5',
                            color: item.in_stock ? '#2e7d32' : '#757575',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={inventoryStyles.tableCell} align="right">
                        <Button
                          size="small"
                          startIcon={<VisibilityOutlinedIcon />}
                          onClick={() => setDetailsItemId(item.id)}
                          sx={{ mr: 1, textTransform: 'none' }}
                        >
                          View Details
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() =>
                            navigate('/remove-item', { state: { itemName: item.name } })
                          }
                          sx={{ textTransform: 'none' }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={itemTotal}
            page={itemPage - 1}
            onPageChange={(_, newPage) => setItemPage(newPage + 1)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
          />
        </>
      )}

      <ItemDetailsDialog
        open={detailsItemId !== null}
        onClose={() => setDetailsItemId(null)}
        itemId={detailsItemId}
      />
    </Box>
  );
}
