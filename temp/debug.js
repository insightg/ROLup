// Add this to your DataTable.jsx to debug the data flow

const debugData = useCallback(() => {
  console.log('Current data state:', data);
  console.log('Current table data:', table.getRowModel().rows.map(row => row.original));
  console.log('Fetched data params:', {
    pagination,
    sorting,
    globalFilter,
    columnFilters
  });
}, [data, table, pagination, sorting, globalFilter, columnFilters]);

// Call this in useEffect after fetchData or add a button to trigger it
// <Button onClick={debugData}>Debug Data</Button>
