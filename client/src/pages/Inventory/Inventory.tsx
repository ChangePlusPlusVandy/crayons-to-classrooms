import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import { browseItemsInfo, getItemInfoCategories, ItemInfoBrowseItem } from '../../api/itemInfo';
import { getWarehouses } from '../../api/warehouse';
import { Warehouse } from '../../types/Warehouse';
import { ItemDetailsDialog } from '../../components/ItemDetailsDialog/ItemDetailsDialog';
import { inventoryStyles } from './Inventory.styles';

const PAGE_SIZE = 10;

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemInfoBrowseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load filter options on mount
  useEffect(() => {
    getWarehouses()
      .then(setWarehouses)
      .catch(() => {});
    getItemInfoCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await browseItemsInfo({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        warehouse: warehouseFilter || undefined,
        category: categoryFilter || undefined,
        stock_status: (stockStatusFilter as 'in_stock' | 'out_of_stock') || undefined,
      });
      setItems(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, [page, search, warehouseFilter, categoryFilter, stockStatusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <Container maxWidth="lg" sx={inventoryStyles.container}>
      <Typography variant="h4" sx={inventoryStyles.header}>
        Inventory Management
      </Typography>
      <Typography variant="body2" sx={inventoryStyles.subtitle}>
        Manage inventory items
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={inventoryStyles.filterBar}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by item name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setPage(1);
              }}
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
                setPage(1);
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
            <InputLabel>Status</InputLabel>
            <Select
              value={stockStatusFilter}
              label="Status"
              onChange={(e) => {
                setStockStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="in_stock">In Stock</MenuItem>
              <MenuItem value="out_of_stock">Not In Inventory</MenuItem>
            </Select>
          </FormControl>

          <Typography sx={inventoryStyles.itemCount}>
            Showing {items.length} of {total} items
          </Typography>
        </Box>
      </Box>

      {loading ? (
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
            count={total}
            page={page - 1}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
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
    </Container>
  );
}
