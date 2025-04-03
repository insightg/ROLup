// src/components/modules/PickManager/api/pickApi.js
import apiUtils from '../../../../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'r_tsis_pick.php';

/**
 * Get all modules
 */
export const fetchModules = async () => {
  try {
    return await apiUtils.get(`${ENDPOINT}?action=getModules`);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all materials
 */
export const fetchMaterials = async () => {
  try {
    return await apiUtils.get(`${ENDPOINT}?action=getMaterials`);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all suppliers
 */
export const fetchSuppliers = async () => {
  try {
    return await apiUtils.get(`${ENDPOINT}?action=getSuppliers`);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all POS orders with sorting and filtering options
 * @param {Object} options - Sorting and filtering options
 * @param {string} options.sortField - Field to sort by
 * @param {string} options.sortOrder - Sort direction ('asc' or 'desc')
 * @param {boolean} options.filterConfigured - Filter to only show configured POS orders
 * @returns {Promise<Object>} - Promise with the response
 */
export const fetchPOSOrders = async (options = {}) => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'getPOSOrders');
    
    // Add sorting parameters
    if (options.sortField) {
      queryParams.append('sort_field', options.sortField);
    }
    
    if (options.sortOrder) {
      queryParams.append('sort_order', options.sortOrder);
    }
    
    // Add filtering parameters
    if (options.filterConfigured !== undefined) {
      queryParams.append('filter_configured', options.filterConfigured ? '1' : '0');
    }
    
    return await apiUtils.get(`${ENDPOINT}?${queryParams.toString()}`);
  } catch (error) {
    console.error('Error fetching POS orders:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get details for a specific POS order
 * @param {number} orderId - Order ID
 */
export const fetchPOSOrderDetails = async (orderId) => {
  if (!orderId) {
    console.error('Missing order ID in fetchPOSOrderDetails');
    return Promise.resolve({ success: false, error: 'Order ID is required' });
  }
  
  try {
    return await apiUtils.get(`${ENDPOINT}?action=getPOSOrderDetails&order_id=${orderId}`);
  } catch (error) {
    console.error('Error fetching POS order details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get modules configured for a specific POS order
 * @param {number} orderId - Order ID
 */
export const fetchPOSModules = (orderId) => {
  if (!orderId) {
    console.error('Missing order ID in fetchPOSModules');
    return Promise.resolve({ success: false, error: 'Order ID is required' });
  }
  return apiUtils.get(`${ENDPOINT}?action=getPOSModules&order_id=${orderId}`);
};

/**
 * Get custom materials for a specific POS order
 * @param {number} orderId - Order ID
 */
export const fetchPOSCustomMaterials = (orderId) => {
  if (!orderId) {
    console.error('Missing order ID in fetchPOSCustomMaterials');
    return Promise.resolve({ success: false, error: 'Order ID is required' });
  }
  return apiUtils.get(`${ENDPOINT}?action=getPOSCustomMaterials&order_id=${orderId}`);
};

/**
 * Save a module configuration for a POS order
 * @param {Object} data - Module data
 */
export const savePOSModule = (data) => {
  // Add validation to ensure all required fields are present
  if (!data.pos_order_id || !data.module_id) {
    console.error('Missing required fields in savePOSModule:', data);
    return Promise.resolve({ 
      success: false, 
      error: 'Missing required fields: pos_order_id and module_id are required'
    });
  }
  
  // Sanitize the data
  const sanitizedData = {
    pos_order_id: Number(data.pos_order_id),
    module_id: Number(data.module_id),
    quantity: Number(data.quantity) || 1,
    installation_type: data.installation_type || 'FLOOR',
    position: data.position || '',
    notes: data.notes || ''
  };
  
  // If this is an update, ensure id is included
  if (data.id) {
    sanitizedData.id = Number(data.id);
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'savePOSModule',
    ...sanitizedData
  });
};

/**
 * Save a custom material for a POS order
 * @param {Object} data - Custom material data
 */
export const savePOSCustomMaterial = (data) => {
  // Add validation to ensure all required fields are present
  if (!data.pos_order_id || !data.description) {
    console.error('Missing required fields in savePOSCustomMaterial:', data);
    return Promise.resolve({ 
      success: false, 
      error: 'Missing required fields: pos_order_id and description are required'
    });
  }
  
  // Sanitize the data to ensure it matches the expected format
  const sanitizedData = {
    pos_order_id: Number(data.pos_order_id),
    supplier_id: data.supplier_id ? Number(data.supplier_id) : null,
    article_code: data.article_code || '',
    description: data.description || '',
    quantity: Number(data.quantity) || 1,
    unit_of_measure: data.unit_of_measure || 'PZ',
    unit_price: data.unit_price ? Number(data.unit_price) : null,
    notes: data.notes || ''
  };
  
  // If this is an update, ensure id is included
  if (data.id) {
    sanitizedData.id = Number(data.id);
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'savePOSCustomMaterial',
    ...sanitizedData
  });
};

/**
 * Delete a module configuration for a POS order
 * @param {number} id - Module configuration ID
 */
export const deletePOSModule = (id) => {
  if (!id) {
    console.error('Missing ID in deletePOSModule');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'deletePOSModule',
    id: Number(id)
  });
};

/**
 * Delete a custom material for a POS order
 * @param {number} id - Custom material ID
 */
export const deletePOSCustomMaterial = (id) => {
  if (!id) {
    console.error('Missing ID in deletePOSCustomMaterial');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'deletePOSCustomMaterial',
    id: Number(id)
  });
};

/**
 * Generate a picking list for multiple POS orders
 * @param {Array<number>} orderIds - Array of order IDs
 */
export const generatePickList = (orderIds) => {
  if (!orderIds || !orderIds.length) {
    console.error('No order IDs provided to generatePickList');
    return Promise.resolve({ 
      success: false, 
      error: 'No orders selected'
    });
  }
  
  // Ensure all IDs are numbers
  const sanitizedOrderIds = orderIds.map(id => Number(id));
  
  return apiUtils.post(ENDPOINT, {
    action: 'generatePickList',
    order_ids: sanitizedOrderIds
  });
};

/**
 * Get all picking lists
 */
export const fetchPickLists = () => {
  return apiUtils.get(`${ENDPOINT}?action=getPickLists`);
};

/**
 * Get details for a specific picking list
 * @param {number} id - Picking list ID
 */
export const fetchPickListDetails = (id) => {
  if (!id) {
    console.error('Missing ID in fetchPickListDetails');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.get(`${ENDPOINT}?action=getPickListDetails&id=${id}`);
};

/**
 * Save a picking list
 * @param {Object} data - Picking list data
 */
export const savePickList = (data) => {
  if (!data.name || !data.details || !data.order_ids || !data.order_ids.length) {
    console.error('Missing required fields in savePickList:', data);
    return Promise.resolve({ 
      success: false, 
      error: 'Missing required fields: name, details, and order_ids are required'
    });
  }
  
  // Ensure numeric values are numbers
  const sanitizedData = {
    ...data,
    order_ids: data.order_ids.map(id => Number(id))
  };
  
  if (data.id) {
    sanitizedData.id = Number(data.id);
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'savePickList',
    ...sanitizedData
  });
};

/**
 * Update the status of a picking list
 * @param {number} id - Picking list ID
 * @param {string} status - New status
 */
export const updatePickListStatus = (id, status) => {
  if (!id || !status) {
    console.error('Missing required parameters in updatePickListStatus');
    return Promise.resolve({ 
      success: false, 
      error: 'ID and status are required'
    });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'updatePickListStatus',
    id: Number(id),
    status
  });
};

// New functions for supplier, material, and module management

/**
 * Save a supplier
 * @param {Object} data - Supplier data
 */
export const saveSupplier = (data) => {
  if (!data.name || !data.code) {
    console.error('Missing required fields in saveSupplier:', data);
    return Promise.resolve({ 
      success: false, 
      error: 'Missing required fields: name and code are required'
    });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'saveSupplier',
    ...data
  });
};

/**
 * Delete a supplier
 * @param {number} id - Supplier ID
 */
export const deleteSupplier = (id) => {
  if (!id) {
    console.error('Missing ID in deleteSupplier');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'deleteSupplier',
    id: Number(id)
  });
};

/**
 * Save a material
 * @param {Object} data - Material data
 */
export const saveMaterial = (data) => {
  if (!data.supplier_id || !data.article_code || !data.description) {
    console.error('Missing required fields in saveMaterial:', data);
    return Promise.resolve({ 
      success: false, 
      error: 'Missing required fields: supplier_id, article_code, and description are required'
    });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'saveMaterial',
    ...data
  });
};

/**
 * Delete a material
 * @param {number} id - Material ID
 */
export const deleteMaterial = (id) => {
  if (!id) {
    console.error('Missing ID in deleteMaterial');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'deleteMaterial',
    id: Number(id)
  });
};

/**
 * Save a module
 * @param {Object} data - Module data
 */
export const saveModule = (data) => {
  if (!data.code || !data.name || !data.width || !data.height) {
    console.error('Missing required fields in saveModule:', data);
    return Promise.resolve({ 
      success: false, 
      error: 'Missing required fields: code, name, width, and height are required'
    });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'saveModule',
    ...data
  });
};

/**
 * Delete a module
 * @param {number} id - Module ID
 */
export const deleteModule = (id) => {
  if (!id) {
    console.error('Missing ID in deleteModule');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'deleteModule',
    id: Number(id)
  });
};

/**
 * Get materials for a specific module
 * @param {number} moduleId - Module ID
 */
export const getModuleMaterials = (moduleId) => {
  if (!moduleId) {
    console.error('Missing module ID in getModuleMaterials');
    return Promise.resolve({ success: false, error: 'Module ID is required' });
  }
  
  return apiUtils.get(`${ENDPOINT}?action=getModuleMaterials&module_id=${moduleId}`);
};

/**
 * Save a material assignment to a module
 * @param {Object} data - Module material data
 */
export const saveModuleMaterial = (data) => {
  if (!data.module_id || !data.material_id || !data.quantity) {
    console.error('Missing required fields in saveModuleMaterial:', data);
    return Promise.resolve({ 
      success: false, 
      error: 'Missing required fields: module_id, material_id, and quantity are required'
    });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'saveModuleMaterial',
    ...data
  });
};

/**
 * Delete a material assignment from a module
 * @param {number} id - Module material assignment ID
 */
export const deleteModuleMaterial = (id) => {
  if (!id) {
    console.error('Missing ID in deleteModuleMaterial');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'deleteModuleMaterial',
    id: Number(id)
  });
};

/**
 * Delete a picking list
 * @param {number} id - Picking list ID
 */
export const deletePickList = (id) => {
  if (!id) {
    console.error('Missing ID in deletePickList');
    return Promise.resolve({ success: false, error: 'ID is required' });
  }
  
  return apiUtils.post(ENDPOINT, {
    action: 'deletePickList',
    id: Number(id)
  });
};
