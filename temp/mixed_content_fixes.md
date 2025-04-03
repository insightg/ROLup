# Mixed Content Fixes

This document outlines the changes made to resolve Mixed Content warnings in the ROL web application when running on HTTPS.

## Problem

The application was hosted at `https://rol.insightg.eu` but was making API requests to insecure HTTP endpoints (`http://212.227.58.58:8000`). This caused modern browsers to block these requests due to security policies.

## Solution

We implemented a robust solution that dynamically determines the correct protocol and base URL for backend API calls based on the environment:

1. Created a centralized API configuration that detects the hostname:
   - When accessed via a production domain (*.insightg.eu): Uses relative path `/backend`
   - When accessed from other origins: Uses direct IP `http://212.227.58.58:8000`

2. Created standardized API utility functions in `src/utils/apiUtils.js`:
   - `apiUtils.get(endpoint)`
   - `apiUtils.post(endpoint, data)`
   - `apiUtils.put(endpoint, data)`
   - `apiUtils.delete(endpoint)`

3. Created module-specific API files with centralized error handling:
   - `src/components/auth/authApi.js`
   - `src/components/users/usersApi.js`
   - `src/components/modules/Anagrafica/api/anagraficaApi.js`
   - `src/components/modules/DashboardPM/api/pmApi.js`
   - `src/components/modules/POSDashboard/api/posApi.ts`
   - `src/components/modules/PickManager/api/pickApi.js`
   - `src/components/modules/RouteOptimizer/api/routeOptimizerApi.js`
   - `src/components/modules/TaskTemplates/taskTemplateApi.js`

4. Updated components to use these API modules instead of direct fetch calls with hardcoded URLs

## Benefits

1. **Security**: The application can now run properly on HTTPS without Mixed Content warnings
2. **Maintainability**: API endpoint configuration is centralized and easier to update
3. **Consistency**: Standardized error handling and request formatting
4. **Flexibility**: The application automatically adapts to different environments
5. **Performance**: Reduced code duplication and improved cache efficiency with relative URLs in production

## Files Modified

- `src/utils/apiConfig.js` - Created dynamic URL resolution
- `src/utils/apiUtils.js` - Centralized API utility functions
- `src/components/auth/AuthContext.jsx` - Updated authentication logic
- `src/components/auth/authApi.js` - Created authentication API module
- `src/components/users/usersApi.js` - Created user management API module
- `src/components/modules/TaskTemplates/taskTemplateApi.js` - Created task templates API module
- `src/components/modules/TaskTemplates/TaskTemplateEditor.jsx` - Updated to use API module
- `src/components/modules/RouteOptimizer/components/RouteMap.jsx` - Fixed hardcoded URLs
- `src/components/modules/PickManager/api/pickApi.js` - Updated API endpoints
- `src/components/modules/PickManager/components/MaterialManagementPanel.jsx` - Updated to use API module
- `docs/api_docs.md` - Added documentation for the new API structure

## Next Steps

1. Continue testing all modules to ensure proper operation with the new API structure
2. Verify CORS configuration on the backend server to ensure it accepts requests from all necessary origins
3. Consider implementing a more comprehensive error handling strategy with user-friendly messages
4. Add proper response type validation to ensure consistent API responses