export const itemDetailsStyles = {
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    pb: 0,
  },
  subtitle: {
    color: 'text.secondary',
    fontSize: '0.875rem',
    px: 3,
    pb: 2,
  },
  fieldLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 500,
    mb: 0.5,
  },
  fieldValue: {
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  fieldRow: {
    display: 'flex',
    gap: 4,
    mb: 2.5,
  },
  fieldGroup: {
    flex: 1,
  },
  section: {
    mb: 2.5,
  },
  warehouseHeader: {
    fontWeight: 600,
    fontSize: '0.9rem',
    mb: 0.5,
  },
  locationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    py: 0.75,
    px: 1.5,
    borderRadius: 1,
    bgcolor: '#f9f9f9',
    mb: 0.5,
  },
  locationCode: {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  locationFixture: {
    color: 'text.secondary',
    fontSize: '0.8rem',
  },
  itemCount: {
    color: 'text.secondary',
    fontSize: '0.8rem',
    ml: 1,
  },
  emptyState: {
    color: 'text.secondary',
    fontStyle: 'italic',
    fontSize: '0.875rem',
  },
  actions: {
    px: 3,
    pb: 2,
    pt: 1,
    gap: 1,
  },
} as const;
