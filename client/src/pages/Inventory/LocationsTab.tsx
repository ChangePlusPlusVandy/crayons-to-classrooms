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
  Button,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import { browseLocationCodes, LocationCodeBrowseItem } from '../../api/storageLocation';
import { Warehouse } from '../../types/Warehouse';
import { LocationCodeDetailsDialog } from '../../components/LocationCodeDetailsDialog/LocationCodeDetailsDialog';
import { inventoryStyles } from './Inventory.styles';

const PAGE_SIZE = 10;

interface LocationsTabProps {
  active: boolean;
  warehouseFilter: string;
  warehouses: Warehouse[];
  onWarehouseChange: (value: string) => void;
}

export function LocationsTab({
  active,
  warehouseFilter,
  warehouses,
  onWarehouseChange,
}: LocationsTabProps) {
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

  useEffect(() => {
    locationDebounceTimer.current = setTimeout(() => {
      setLocationSearch(locationSearchInput);
      setLocationPage(1);
    }, 300);
    return () => clearTimeout(locationDebounceTimer.current);
  }, [locationSearchInput]);

  useEffect(() => {
    setLocationPage(1);
  }, [warehouseFilter]);

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
    if (active) fetchLocations();
  }, [active, fetchLocations]);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
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
                      <TableCell sx={inventoryStyles.tableCell}>{loc.warehouse_name}</TableCell>
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

      <LocationCodeDetailsDialog
        open={detailsLocationId !== null}
        onClose={() => setDetailsLocationId(null)}
        locationId={detailsLocationId}
      />
    </Box>
  );
}
