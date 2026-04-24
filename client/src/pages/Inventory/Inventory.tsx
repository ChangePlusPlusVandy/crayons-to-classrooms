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
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import { browseItemsInfo, getItemInfoCategories, ItemInfoBrowseItem } from '../../api/itemInfo';
import { getWarehouses } from '../../api/warehouse';
import {
  browseLocationCodes,
  LocationCodeBrowseItem,
} from '../../api/storageLocation';
import { Warehouse } from '../../types/Warehouse';
import { ItemDetailsDialog } from '../../components/ItemDetailsDialog/ItemDetailsDialog';
import { LocationCodeDetailsDialog } from '../../components/LocationCodeDetailsDialog/LocationCodeDetailsDialog';
import { inventoryStyles } from './Inventory.styles';

const PAGE_SIZE = 10;

type TabValue = 'item' | 'location';

export default function Inventory() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>('item');

  // Shared filter across tabs
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // ---------- Item tab state ----------
  const [items, setItems] = useState<ItemInfoBrowseItem[]>([]);
  const [itemTotal, setItemTotal] = useState(0);
  const [itemPage, setItemPage] = useState(1);
  const [itemLoading, setItemLoading] = useState(true);
  const [itemError, setItemError] = useState<string | null>(null);

  const [itemSearchInput, setItemSearchInput] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);

  const itemDebounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ---------- Location tab state ----------
  const [locations, setLocations] = useState<LocationCodeBrowseItem[]>([]);
  const [locationTotal, setLocationTotal] = useState(0);
  const [locationPage, setLocationPage] = useState(1);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [locationSearchInput, setLocationSearchInput] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [detailsLocationId, setDetailsLocationId] = useState<string | null>(null);

  const locationDebounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load filter options on mount
  useEffect(() => {
    getWarehouses()
      .then(setWarehouses)
      .catch(() => {});
    getItemInfoCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Debounce item search
  useEffect(() => {
    itemDebounceTimer.current = setTimeout(() => {
      setItemSearch(itemSearchInput);
      setItemPage(1);
    }, 300);
    return () => clearTimeout(itemDebounceTimer.current);
  }, [itemSearchInput]);

  // Debounce location search
  useEffect(() => {
    locationDebounceTimer.current = setTimeout(() => {
      setLocationSearch(locationSearchInput);
      setLocationPage(1);
    }, 300);
    return () => clearTimeout(locationDebounceTimer.current);
  }, [locationSearchInput]);

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
        stock_status: (stockStatusFilter as 'in_stock' | 'out_of_stock') || undefined,
      });
      setItems(result.data);
      setItemTotal(result.total);
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setItemLoading(false);
    }
  }, [itemPage, itemSearch, warehouseFilter, categoryFilter, stockStatusFilter]);

  const fetchLocations = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const result = await browseLocationCodes({
        page: locationPage,
        limit: PAGE_SIZE,
        search: locationSearch || undefined,
        warehouse: warehouseFilter || undefined,
        include_empty: includeEmpty,
      });
      setLocations(result.data);
      setLocationTotal(result.total);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setLocationLoading(false);
    }
  }, [locationPage, locationSearch, warehouseFilter, includeEmpty]);

  useEffect(() => {
    if (tab === 'item') fetchItems();
  }, [tab, fetchItems]);

  useEffect(() => {
    if (tab === 'location') fetchLocations();
  }, [tab, fetchLocations]);

  const handleWarehouseChange = (value: string) => {
    setWarehouseFilter(value);
    setItemPage(1);
    setLocationPage(1);
  };

  return (
    <Container maxWidth="lg" sx={inventoryStyles.container}>
      <Typography variant="h4" sx={inventoryStyles.header}>
        Inventory Management
      </Typography>
      <Typography variant="body2" sx={inventoryStyles.subtitle}>
        Manage inventory items
      </Typography>

      <Box sx={inventoryStyles.tabsBar}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="By Item" value="item" sx={{ textTransform: 'none' }} />
          <Tab label="By Location Code" value="location" sx={{ textTransform: 'none' }} />
        </Tabs>
      </Box>

      {tab === 'item' && (
        <>
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
                  onChange={(e) => handleWarehouseChange(e.target.value)}
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
        </>
      )}

      {tab === 'location' && (
        <>
          {locationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {locationError}
            </Alert>
          )}

          <Box sx={inventoryStyles.filterBar}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by location code..."
              value={locationSearchInput}
              onChange={(e) => setLocationSearchInput(e.target.value)}
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
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                >
                  <MenuItem value="">All Warehouses</MenuItem>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={includeEmpty}
                    onChange={(e) => {
                      setIncludeEmpty(e.target.checked);
                      setLocationPage(1);
                    }}
                  />
                }
                label="Show empty locations"
                sx={{ ml: 0 }}
              />

              <Typography sx={inventoryStyles.itemCount}>
                Showing {locations.length} of {locationTotal} locations
              </Typography>
            </Box>
          </Box>

          {locationLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} sx={inventoryStyles.tableContainer}>
                <Table size="small" sx={inventoryStyles.table}>
                  <TableHead sx={inventoryStyles.tableHead}>
                    <TableRow>
                      <TableCell sx={inventoryStyles.tableHeadCell}>Location Code</TableCell>
                      <TableCell sx={inventoryStyles.tableHeadCell}>Warehouse</TableCell>
                      <TableCell sx={inventoryStyles.tableHeadCell}>Stock</TableCell>
                      <TableCell sx={inventoryStyles.tableHeadCell} align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={inventoryStyles.tableCell}>
                          No locations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      locations.map((loc) => (
                        <TableRow key={loc.id} sx={inventoryStyles.tableRow}>
                          <TableCell sx={inventoryStyles.tableCell}>{loc.location_code}</TableCell>
                          <TableCell sx={inventoryStyles.tableCell}>
                            {loc.warehouse_name}
                          </TableCell>
                          <TableCell sx={inventoryStyles.tableCell}>
                            {loc.is_empty
                              ? 'Empty'
                              : `${loc.distinct_items} items · ${loc.total_units} units`}
                          </TableCell>
                          <TableCell sx={inventoryStyles.tableCell} align="right">
                            <Button
                              size="small"
                              startIcon={<VisibilityOutlinedIcon />}
                              onClick={() => setDetailsLocationId(loc.id)}
                              sx={{ textTransform: 'none' }}
                            >
                              View Details
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
                count={locationTotal}
                page={locationPage - 1}
                onPageChange={(_, newPage) => setLocationPage(newPage + 1)}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
              />
            </>
          )}
        </>
      )}

      <ItemDetailsDialog
        open={detailsItemId !== null}
        onClose={() => setDetailsItemId(null)}
        itemId={detailsItemId}
      />

      <LocationCodeDetailsDialog
        open={detailsLocationId !== null}
        onClose={() => setDetailsLocationId(null)}
        locationId={detailsLocationId}
      />
    </Container>
  );
}
