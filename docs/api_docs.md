# ROL Web Application API Documentation

## API Configuration

The ROL application automatically determines the correct API endpoint based on the current hostname:

- When accessed via a production domain (*.insightg.eu): Uses relative path `/backend`
- When accessed via other domains: Uses direct IP `http://212.227.58.58:8000`

This configuration is centralized in `/src/utils/apiConfig.js` which provides:

```javascript
// Determine base URL based on hostname
BASE_URL: (() => {
  const hostname = window.location.hostname;
  if (hostname === 'rol.insightg.eu' || 
      hostname.endsWith('.insightg.eu') || 
      hostname.indexOf('.insightg.') !== -1) {
    return '/backend'; // Use relative path for production domains
  }
  return 'http://212.227.58.58:8000'; // Use direct IP for development
})()
```

## API Utilities

Common API utilities are provided in `/src/utils/apiUtils.js`:

- `apiUtils.get(endpoint)` - GET request
- `apiUtils.post(endpoint, data)` - POST request
- `apiUtils.put(endpoint, data)` - PUT request
- `apiUtils.delete(endpoint)` - DELETE request

All responses follow a standard format:

```javascript
{
  success: boolean,       // true or false
  data: object|array,     // optional, present on success
  error: string,          // optional, present on failure
  total: number,          // optional, for pagination
  // ... other metadata fields
}
```

## Module-Specific APIs

### Authentication API

- `checkAuthStatus()` - Verifies current authentication status
- `login(username, password)` - Performs a login
- `logout()` - Performs a logout
- `changePassword(currentPassword, newPassword)` - Updates user password
- `getProfile()` - Retrieves user profile information

### Anagrafica API

- `fetchRecords(options)` - Retrieves anagrafica records with filtering
- `fetchRecord(id)` - Retrieves a specific anagrafica record
- `updateRecord(data)` - Updates an anagrafica record
- `createRecord(data)` - Creates a new anagrafica record
- `deleteRecord(id)` - Deletes an anagrafica record
- `importRecords(file, mappings)` - Imports records from a file

### PM Dashboard API

- `fetchPOSOrders(options)` - Retrieves POS orders with filtering
- `fetchOrderDetails(id)` - Retrieves details for a specific order
- `updateOrderStatus(id, status)` - Updates the status of an order
- `assignPMToOrder(id, pmId)` - Assigns a project manager to an order
- `fetchOrderTasks(id)` - Retrieves tasks for a specific order

### Pick Manager API

- `fetchModules()` - Retrieves all modules
- `fetchMaterials()` - Retrieves all materials
- `fetchSuppliers()` - Retrieves all suppliers
- `saveMaterial(data)` - Creates or updates a material
- `saveSupplier(data)` - Creates or updates a supplier
- `generatePickList(orderIds)` - Generates a picking list for orders

### TaskTemplates API

- `fetchTaskTemplates()` - Retrieves all task templates
- `fetchTaskTemplate(id)` - Retrieves a specific task template
- `createTaskTemplate(data)` - Creates a new task template
- `updateTaskTemplate(data)` - Updates an existing task template
- `deleteTaskTemplate(id)` - Deletes a task template

### User Management API

- `fetchUsers()` - Retrieves all users
- `fetchGroups()` - Retrieves all groups
- `createUser(data)` - Creates a new user
- `updateUser(data)` - Updates an existing user
- `createGroup(data)` - Creates a new group
- `updateGroup(data)` - Updates an existing group

## Implementation Notes

The URL structure for all API endpoints is:

`${BASE_URL}/${ENDPOINT}?action=${ACTION}`

For GET requests, additional parameters are appended to the URL. For POST requests, parameters are sent in the request body.

Example:

```javascript
// GET request
const result = await apiUtils.get(`${ENDPOINT}?action=getUsers`);

// POST request
const result = await apiUtils.post(ENDPOINT, {
  action: 'createUser',
  ...userData
});
```