import { SxProps, Theme } from '@mui/material';

export const alertsSectionStyles: Record<string, SxProps<Theme>> = {
  /** Spacing to Quick Actions below matches Quick Actions title `mb: 2` rhythm */
  root: {
    mb: 2,
  },

  /**
   * Alerts title row: same typography and padding rhythm as Quick Actions
   * (`CardContent` + `Typography variant="h6"` / `fontWeight: 600`).
   */
  alertsTableHeaderCell: {
    bgcolor: '#FFFFFF',
    p: 0,
    px: 2,
    py: 2,
    verticalAlign: 'middle',
    borderBottom: 'none',
  },

  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    cursor: 'pointer',
    userSelect: 'none',
  },

  /** Nested table under Collapse — flush with header row */
  nestedTable: {
    width: '100%',
  },

  collapseCell: {
    p: 0,
    border: 'none',
    verticalAlign: 'top',
  },

  /** Matches Quick Actions “Add Item” / “Remove Item” palette */
  outOfStockQuickActionGreen: {
    height: 36,
    borderRadius: '10px',
    minWidth: 'unset',
    px: 1.5,
    textTransform: 'none',
    boxShadow: 'none',
    bgcolor: '#d4edda',
    color: '#1e7e34',
    border: 'none',
    '&.MuiButton-outlined': { border: 'none' },
    '&:hover': {
      bgcolor: '#d4edda',
      border: 'none',
      opacity: 0.85,
      boxShadow: 'none',
    },
  },

  outOfStockQuickActionRed: {
    height: 36,
    borderRadius: '10px',
    minWidth: 'unset',
    px: 1.5,
    textTransform: 'none',
    boxShadow: 'none',
    bgcolor: '#f8d7da',
    color: '#a71d2a',
    border: 'none',
    '&.MuiButton-outlined': { border: 'none' },
    '&:hover': {
      bgcolor: '#f8d7da',
      border: 'none',
      opacity: 0.85,
      boxShadow: 'none',
    },
  },
};
