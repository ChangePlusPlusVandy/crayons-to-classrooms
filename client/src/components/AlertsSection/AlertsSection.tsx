import {
  Typography,
  Button,
  Box,
  Collapse,
  IconButton,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useCallback, useEffect, useState } from 'react';
import { alertsSectionStyles } from './AlertsSection.styles';
import { limboStyles } from '../../pages/Limbo/Limbo.styles';
import { getOutOfStockItems, patchItemInfo, deleteItemInfo, ItemInfo } from '../../api/itemInfo';
import itemIcon from '../../assets/item.svg';

export default function AlertsSection() {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [limboActionId, setLimboActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemInfo | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const tableActionsLocked = limboActionId !== null || deleteSubmitting || itemToDelete !== null;

  const loadOutOfStock = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getOutOfStockItems();
      setItems(data);
    } catch {
      setLoadError('Could not load out-of-stock items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOutOfStock();
  }, [loadOutOfStock]);

  const handleSendToLimbo = async (item: ItemInfo) => {
    setActionError(null);
    setLimboActionId(item.id);
    try {
      await patchItemInfo(item.id, { limbo: true });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not send item to limbo.');
    } finally {
      setLimboActionId(null);
    }
  };

  const closeDeleteDialog = () => {
    if (!deleteSubmitting) setItemToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    setActionError(null);
    setDeleteSubmitting(true);
    try {
      await deleteItemInfo(target.id);
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      setItemToDelete(null);
    } catch (e) {
      setItemToDelete(null);
      setActionError(e instanceof Error ? e.message : 'Could not delete item.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const alertsTitle = loading
    ? 'Limbo Alerts - Loading…'
    : loadError
      ? 'Limbo Alerts - Could not load count'
      : items.length === 1
        ? 'Limbo Alerts - 1 item out of stock'
        : `Limbo Alerts - ${items.length} items out of stock`;

  return (
    <Box sx={alertsSectionStyles.root}>
      <Card
        sx={{
          ...limboStyles.card,
          overflow: 'hidden',
          ...(!expanded && {
            borderBottomLeftRadius: '10px',
            borderBottomRightRadius: '10px',
          }),
        }}
      >
        <TableContainer
          component={Paper}
          sx={{
            ...limboStyles.tableContainer,
            borderRadius: 0,
            boxShadow: 'none',
          }}
        >
          <Table size="small" aria-label="Out of stock alerts" sx={limboStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={2}
                  sx={{
                    ...alertsSectionStyles.alertsTableHeaderCell,
                    borderBottom: expanded ? '1px solid #F5F5F5' : 'none',
                  }}
                >
                  <Box
                    sx={alertsSectionStyles.dropdownHeader}
                    onClick={() => setExpanded(!expanded)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpanded(!expanded);
                      }
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {alertsTitle}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label={
                        expanded ? 'Collapse out-of-stock items' : 'Expand out-of-stock items'
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionError(null);
                        setExpanded(!expanded);
                      }}
                      sx={{
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s',
                        color: 'text.secondary',
                        flexShrink: 0,
                      }}
                    >
                      <ExpandMoreIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2} sx={alertsSectionStyles.collapseCell}>
                  <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Table
                      size="small"
                      sx={{ ...limboStyles.table, ...alertsSectionStyles.nestedTable }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell sx={limboStyles.tableHeadCell}>Item Name</TableCell>
                          <TableCell sx={limboStyles.tableHeadCell} align="right">
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {actionError && (
                          <TableRow>
                            <TableCell colSpan={2} sx={limboStyles.tableCell}>
                              <Alert
                                severity="error"
                                sx={{ py: 0 }}
                                onClose={() => setActionError(null)}
                              >
                                {actionError}
                              </Alert>
                            </TableCell>
                          </TableRow>
                        )}

                        {loading && (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              sx={{ ...limboStyles.tableCell, py: 4, textAlign: 'center' }}
                            >
                              <CircularProgress size={28} />
                            </TableCell>
                          </TableRow>
                        )}

                        {!loading && loadError && (
                          <TableRow>
                            <TableCell colSpan={2} sx={limboStyles.tableCell}>
                              <Alert severity="error" sx={{ py: 0 }}>
                                {loadError}
                              </Alert>
                            </TableCell>
                          </TableRow>
                        )}

                        {!loading &&
                          !loadError &&
                          items.map((row, idx) => (
                            <TableRow
                              key={row.id}
                              sx={{
                                backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5',
                              }}
                            >
                              <TableCell sx={{ ...limboStyles.tableCell, color: '#111827' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box
                                    component="img"
                                    src={itemIcon}
                                    alt=""
                                    sx={{ width: 16, height: 16 }}
                                  />
                                  {row.name}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ ...limboStyles.tableCell, py: 0 }} align="right">
                                <Box
                                  sx={{
                                    minHeight: 69,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 1,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={tableActionsLocked}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleSendToLimbo(row);
                                    }}
                                    sx={alertsSectionStyles.outOfStockQuickActionGreen}
                                  >
                                    {limboActionId === row.id ? 'Sending…' : 'Send to limbo'}
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={tableActionsLocked}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionError(null);
                                      setItemToDelete(row);
                                    }}
                                    sx={alertsSectionStyles.outOfStockQuickActionRed}
                                  >
                                    Delete
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}

                        {!loading && !loadError && items.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} sx={limboStyles.tableCell}>
                              <Typography variant="body2" color="text.secondary">
                                No out-of-stock items (active inventory).
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Collapse>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={itemToDelete !== null}
        onClose={() => {
          if (!deleteSubmitting) closeDeleteDialog();
        }}
        maxWidth={false}
        fullWidth={false}
        slotProps={{ paper: { sx: limboStyles.restockDialogPaper } }}
        aria-labelledby="delete-item-info-dialog-title"
      >
        <DialogContent sx={limboStyles.restockDialogContent}>
          <Box sx={limboStyles.restockDialogClose} onClick={closeDeleteDialog}>
            ×
          </Box>
          <Typography id="delete-item-info-dialog-title" sx={limboStyles.restockDialogTitle}>
            Delete Item Info
          </Typography>

          <Box sx={limboStyles.restockOptionsBox}>
            <Typography
              component="p"
              sx={{
                ...limboStyles.restockingLabel,
                m: 0,
              }}
            >
              Are you sure you want to delete{' '}
              <Box component="span" sx={limboStyles.restockItemName}>
                {itemToDelete?.name ?? ''}
              </Box>
              ?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end', pr: 3, pb: 2, gap: 1.5 }}>
          <Button
            onClick={closeDeleteDialog}
            disabled={deleteSubmitting}
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
            variant="outlined"
            size="small"
            disabled={deleteSubmitting}
            onClick={() => void handleConfirmDelete()}
            sx={alertsSectionStyles.outOfStockQuickActionRed}
          >
            {deleteSubmitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
