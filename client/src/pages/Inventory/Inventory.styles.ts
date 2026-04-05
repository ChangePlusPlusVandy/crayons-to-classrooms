export const inventoryStyles = {
  container: {
    py: 4,
    px: { xs: 2, sm: 4 },
  },
  header: {
    mb: 0.5,
    fontSize: { xs: '1.5rem', sm: '2.25rem' },
    fontWeight: 400,
  },
  subtitle: {
    mb: 3,
    color: 'text.secondary',
    fontSize: { xs: '0.85rem', sm: '1rem' },
  },
  filterBar: {
    bgcolor: 'white',
    borderRadius: '12px 12px 0 0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    p: { xs: 2, sm: 3.5 },
    pb: { xs: 2, sm: 3 },
    mb: 0,
  },
  searchField: {
    mb: 2.5,
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: { xs: 1.5, sm: 2.5 },
  },
  filterSelect: {
    minWidth: { xs: 140, sm: 180 },
  },
  itemCount: {
    ml: 'auto',
    color: 'text.secondary',
    fontSize: { xs: '0.8rem', sm: '0.875rem' },
    whiteSpace: 'nowrap',
  },
  tableContainer: {
    bgcolor: 'white',
    borderRadius: '0 0 12px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflowX: 'auto',
    width: '100%',
    minHeight: 400,
  },
  table: {
    minWidth: { xs: 500, sm: 650 },
  },
  tableHead: {
    bgcolor: '#f0f0f0',
  },
  tableHeadCell: {
    fontWeight: 600,
    fontSize: { xs: '0.75rem', sm: '0.875rem' },
    color: '#000000',
    borderBottom: '1px solid',
    borderColor: '#e0e0e0',
    py: 1,
    px: { xs: 1.5, sm: 3 },
    whiteSpace: 'nowrap',
  },
  tableRow: {
    '&:hover': {
      bgcolor: '#fafafa',
    },
  },
  tableCell: {
    py: { xs: 1, sm: 1.5 },
    px: { xs: 1.5, sm: 3 },
    fontSize: { xs: '0.8rem', sm: '0.875rem' },
    borderBottom: '1px solid',
    borderColor: '#eeeeee',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: { xs: 0.5, sm: 1 },
    py: 3,
  },
  paginationButton: {
    textTransform: 'none',
    fontWeight: 500,
    minWidth: { xs: 32, sm: 36 },
    px: { xs: 0.75, sm: 1.5 },
    fontSize: { xs: '0.75rem', sm: '0.875rem' },
  },
  paginationEllipsis: {
    px: 1,
    color: '#666',
    userSelect: 'none',
  },
} as const;
