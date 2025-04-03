// src/components/modules/PickManager/stores/pickStore.js - Extended

import { create } from 'zustand';
import { 
  fetchModules, 
  fetchMaterials, 
  fetchSuppliers, 
  fetchPOSOrders,
  fetchPickLists,
  saveSupplier,
  deleteSupplier,
  saveMaterial,
  deleteMaterial,
  saveModule,
  deleteModule,
  getModuleMaterials,
  getModuleComponents,
  saveModuleMaterial,
  deleteModuleMaterial
} from '../api/pickApi';

// Debounce helper to prevent multiple rapid API calls
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// API call tracking to prevent duplicates
const apiCallTracker = {
  activeCalls: new Set(),
  isCallActive: function(callId) {
    return this.activeCalls.has(callId);
  },
  startCall: function(callId) {
    this.activeCalls.add(callId);
    return true;
  },
  endCall: function(callId) {
    this.activeCalls.delete(callId);
  }
};

export const usePickStore = create((set, get) => ({
  // State
  modules: [],
  materials: [],
  suppliers: [],
  posOrders: [],
  pickLists: [],
  selectedOrders: [],
  isLoading: false,
  error: null,
  userRole: null,
  
  // Configuration States
  moduleMaterials: [], // Materials for a specific module
  moduleComponents: {}, // Components for modules, indexed by module_id
  
  // Getters
  getSelectedOrders: () => get().selectedOrders,
  getModuleById: (id) => get().modules.find(module => module.id === id),
  getMaterialById: (id) => get().materials.find(material => material.id === id),
  getSupplierById: (id) => get().suppliers.find(supplier => supplier.id === id),
  getOrderById: (id) => get().posOrders.find(order => order.id === id),
  getModuleComponents: (moduleId) => get().moduleComponents[moduleId] || [],
  
  // Actions
  setModules: (modules) => set({ modules }),
  setMaterials: (materials) => set({ materials }),
  setSuppliers: (suppliers) => set({ suppliers }),
  setPOSOrders: (posOrders) => set({ posOrders }),
  setPickLists: (pickLists) => set({ pickLists }),
  setSelectedOrders: (selectedOrders) => set({ selectedOrders }),
  setModuleMaterials: (moduleMaterials) => set({ moduleMaterials }),
  setModuleComponents: (moduleId, components) => set(state => ({ 
    moduleComponents: { 
      ...state.moduleComponents, 
      [moduleId]: components 
    } 
  })),
  toggleOrderSelection: (orderId) => {
    const currentSelected = get().selectedOrders;
    const isSelected = currentSelected.includes(orderId);
    
    if (isSelected) {
      set({ selectedOrders: currentSelected.filter(id => id !== orderId) });
    } else {
      set({ selectedOrders: [...currentSelected, orderId] });
    }
  },
  clearOrderSelection: () => set({ selectedOrders: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setUserRole: (role) => set({ userRole: role }),
  
  // Extended configuration actions
  
  // Add a new supplier or update an existing one
  saveSupplier: async (supplierData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await saveSupplier(supplierData);
      if (response.success) {
        // If updating an existing supplier
        if (supplierData.id) {
          const updatedSuppliers = get().suppliers.map(supplier => 
            supplier.id === supplierData.id ? { ...supplier, ...supplierData } : supplier
          );
          set({ suppliers: updatedSuppliers });
        } else {
          // If adding a new supplier
          const newSupplier = {
            ...supplierData,
            id: response.id // Use the ID returned from the server
          };
          set({ suppliers: [...get().suppliers, newSupplier] });
        }
        return { success: true };
      } else {
        set({ error: response.error || 'Error saving supplier' });
        return response;
      }
    } catch (error) {
      console.error('Error in saveSupplier:', error);
      set({ error: 'Error saving supplier: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete a supplier
  deleteSupplier: async (supplierId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await deleteSupplier(supplierId);
      if (response.success) {
        const updatedSuppliers = get().suppliers.filter(
          supplier => supplier.id !== supplierId
        );
        set({ suppliers: updatedSuppliers });
        return { success: true };
      } else {
        set({ error: response.error || 'Error deleting supplier' });
        return response;
      }
    } catch (error) {
      console.error('Error in deleteSupplier:', error);
      set({ error: 'Error deleting supplier: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Add or update a material
  saveMaterial: async (materialData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await saveMaterial(materialData);
      if (response.success) {
        // If updating an existing material
        if (materialData.id) {
          const updatedMaterials = get().materials.map(material => 
            material.id === materialData.id ? { ...material, ...materialData } : material
          );
          set({ materials: updatedMaterials });
        } else {
          // If adding a new material
          const newMaterial = {
            ...materialData,
            id: response.id // Use the ID returned from the server
          };
          set({ materials: [...get().materials, newMaterial] });
        }
        return { success: true };
      } else {
        set({ error: response.error || 'Error saving material' });
        return response;
      }
    } catch (error) {
      console.error('Error in saveMaterial:', error);
      set({ error: 'Error saving material: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete a material
  deleteMaterial: async (materialId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await deleteMaterial(materialId);
      if (response.success) {
        const updatedMaterials = get().materials.filter(
          material => material.id !== materialId
        );
        set({ materials: updatedMaterials });
        return { success: true };
      } else {
        set({ error: response.error || 'Error deleting material' });
        return response;
      }
    } catch (error) {
      console.error('Error in deleteMaterial:', error);
      set({ error: 'Error deleting material: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Add or update a module
  saveModule: async (moduleData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await saveModule(moduleData);
      if (response.success) {
        // If updating an existing module
        if (moduleData.id) {
          const updatedModules = get().modules.map(module => 
            module.id === moduleData.id ? { ...module, ...moduleData } : module
          );
          set({ modules: updatedModules });
        } else {
          // If adding a new module
          const newModule = {
            ...moduleData,
            id: response.id // Use the ID returned from the server
          };
          set({ modules: [...get().modules, newModule] });
        }
        return { success: true };
      } else {
        set({ error: response.error || 'Error saving module' });
        return response;
      }
    } catch (error) {
      console.error('Error in saveModule:', error);
      set({ error: 'Error saving module: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete a module
  deleteModule: async (moduleId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await deleteModule(moduleId);
      if (response.success) {
        const updatedModules = get().modules.filter(
          module => module.id !== moduleId
        );
        set({ modules: updatedModules });
        return { success: true };
      } else {
        set({ error: response.error || 'Error deleting module' });
        return response;
      }
    } catch (error) {
      console.error('Error in deleteModule:', error);
      set({ error: 'Error deleting module: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Get materials for a specific module
  loadModuleMaterials: async (moduleId) => {
    const callId = `loadModuleMaterials-${moduleId}`;
    
    if (apiCallTracker.isCallActive(callId)) {
      console.log("Module materials load already in progress, skipping duplicate call");
      return { success: false, error: 'Operation already in progress' };
    }
    
    try {
      console.log(`Loading materials for module ID ${moduleId}...`);
      apiCallTracker.startCall(callId);
      set({ isLoading: true, error: null });
      
      const response = await getModuleMaterials(moduleId);
      
      if (response.success) {
        set({ moduleMaterials: response.data });
        return response;
      } else {
        set({ error: response.error || 'Error loading module materials' });
        return response;
      }
    } catch (error) {
      console.error('Error loading module materials:', error);
      set({ error: 'Error in communication with server' });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
      apiCallTracker.endCall(callId);
    }
  },
  
  // Load components for a specific module
  loadModuleComponents: async (moduleId) => {
    const callId = `loadModuleComponents-${moduleId}`;
    
    if (apiCallTracker.isCallActive(callId)) {
      console.log("Module components load already in progress, skipping duplicate call");
      return { success: false, error: 'Operation already in progress' };
    }
    
    try {
      console.log(`Loading components for module ID ${moduleId}...`);
      apiCallTracker.startCall(callId);
      set({ isLoading: true, error: null });
      
      const response = await getModuleComponents(moduleId);
      
      if (response.success) {
        get().setModuleComponents(moduleId, response.data);
        return response;
      } else {
        set({ error: response.error || 'Error loading module components' });
        return response;
      }
    } catch (error) {
      console.error('Error loading module components:', error);
      set({ error: 'Error in communication with server' });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
      apiCallTracker.endCall(callId);
    }
  },
  
  // Add or update a material assignment to a module
  saveModuleMaterial: async (moduleMaterialData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await saveModuleMaterial(moduleMaterialData);
      if (response.success) {
        // Refresh module materials after saving
        await get().loadModuleMaterials(moduleMaterialData.module_id);
        return { success: true };
      } else {
        set({ error: response.error || 'Error saving module material' });
        return response;
      }
    } catch (error) {
      console.error('Error in saveModuleMaterial:', error);
      set({ error: 'Error saving module material: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete a material assignment from a module
  deleteModuleMaterial: async (id, moduleId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await deleteModuleMaterial(id);
      if (response.success) {
        // Refresh module materials after deletion
        if (moduleId) {
          await get().loadModuleMaterials(moduleId);
        }
        return { success: true };
      } else {
        set({ error: response.error || 'Error deleting module material' });
        return response;
      }
    } catch (error) {
      console.error('Error in deleteModuleMaterial:', error);
      set({ error: 'Error deleting module material: ' + error.message });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Data loading actions from the original store
  loadModules: async () => {
    const callId = 'loadModules';
    
    if (apiCallTracker.isCallActive(callId)) {
      console.log("Modules load already in progress, skipping duplicate call");
      return { success: false, error: 'Operation already in progress' };
    }
    
    try {
      console.log("Loading modules...");
      apiCallTracker.startCall(callId);
      const response = await fetchModules();
      if (response.success) {
        set({ modules: response.data });
        return response;
      } else {
        set({ error: response.error || 'Error loading modules' });
        return response;
      }
    } catch (error) {
      console.error('Error loading modules:', error);
      set({ error: 'Error in modules communication with server' });
      return { success: false, error: error.message };
    } finally {
      apiCallTracker.endCall(callId);
    }
  },
  
  // Load pick lists
  loadPickLists: async () => {
    const callId = 'loadPickLists';
    
    if (apiCallTracker.isCallActive(callId)) {
      console.log("Pick lists load already in progress, skipping duplicate call");
      return { success: false, error: 'Operation already in progress' };
    }
    
    try {
      console.log("Loading pick lists...");
      apiCallTracker.startCall(callId);
      set({ isLoading: true, error: null });
      
      const response = await fetchPickLists();
      
      if (response.success) {
        set({ pickLists: response.data });
        return response;
      } else {
        set({ error: response.error || 'Error loading pick lists' });
        return response;
      }
    } catch (error) {
      console.error('Error loading pick lists:', error);
      set({ error: 'Error in pick lists communication with server' });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
      apiCallTracker.endCall(callId);
    }
  },
  
  // Other data loading actions from the original store...
  
  loadMaterials: async () => {
    const callId = 'loadMaterials';
    
    if (apiCallTracker.isCallActive(callId)) {
      console.log("Materials load already in progress, skipping duplicate call");
      return { success: false, error: 'Operation already in progress' };
    }
    
    try {
      console.log("Loading materials...");
      apiCallTracker.startCall(callId);
      const response = await fetchMaterials();
      if (response.success) {
        set({ materials: response.data });
        return response;
      } else {
        set({ error: response.error || 'Error loading materials' });
        return response;
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      set({ error: 'Error in materials communication with server' });
      return { success: false, error: error.message };
    } finally {
      apiCallTracker.endCall(callId);
    }
  },
  
  loadSuppliers: async () => {
    const callId = 'loadSuppliers';
    
    if (apiCallTracker.isCallActive(callId)) {
      console.log("Suppliers load already in progress, skipping duplicate call");
      return { success: false, error: 'Operation already in progress' };
    }
    
    try {
      console.log("Loading suppliers...");
      apiCallTracker.startCall(callId);
      const response = await fetchSuppliers();
      if (response.success) {
        set({ suppliers: response.data });
        return response;
      } else {
        set({ error: response.error || 'Error loading suppliers' });
        return response;
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      set({ error: 'Error in suppliers communication with server' });
      return { success: false, error: error.message };
    } finally {
      apiCallTracker.endCall(callId);
    }
  },
  
  // Refresh all data
  refreshData: async () => {
    const callId = 'refreshData';
    
    if (apiCallTracker.isCallActive(callId)) {
      console.log("Data refresh already in progress, skipping duplicate call");
      return { success: false, error: 'Operation already in progress' };
    }
    
    console.log("Refreshing all data...");
    apiCallTracker.startCall(callId);
    set({ isLoading: true, error: null });
    let authError = false;
    
    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled([
        fetchModules(),
        fetchMaterials(),
        fetchSuppliers(),
        fetchPOSOrders(),
        fetchPickLists()
      ]);
      
      console.log("All data requests completed.");
      
      // Process results safely even if some failed
      const [
        modulesResult,
        materialsResult,
        suppliersResult,
        ordersResult,
        pickListsResult
      ] = results;
      
      const modulesResponse = modulesResult.status === 'fulfilled' ? modulesResult.value : { success: false };
      const materialsResponse = materialsResult.status === 'fulfilled' ? materialsResult.value : { success: false };
      const suppliersResponse = suppliersResult.status === 'fulfilled' ? suppliersResult.value : { success: false };
      const ordersResponse = ordersResult.status === 'fulfilled' ? ordersResult.value : { success: false };
      const pickListsResponse = pickListsResult.status === 'fulfilled' ? pickListsResult.value : { success: false };
      
      // Check for authentication errors
      if (
        modulesResponse.authError || 
        materialsResponse.authError || 
        suppliersResponse.authError || 
        ordersResponse.authError || 
        pickListsResponse.authError
      ) {
        authError = true;
        set({ error: 'Authentication failed. Please log in again.' });
        return { success: false, authError: true };
      }
      
      // Update state with responses
      const updates = {};
      
      if (modulesResponse.success) {
        updates.modules = modulesResponse.data;
      }
      
      if (materialsResponse.success) {
        updates.materials = materialsResponse.data;
      }
      
      if (suppliersResponse.success) {
        updates.suppliers = suppliersResponse.data;
      }
      
      if (ordersResponse.success) {
        updates.posOrders = ordersResponse.data;
        updates.userRole = ordersResponse.userRole || get().userRole;
      }
      
      if (pickListsResponse.success) {
        updates.pickLists = pickListsResponse.data;
      }
      
      // Apply all updates at once to prevent multiple rerenders
      set(updates);
      
      return { success: true };
    } catch (error) {
      console.error('Error refreshing data:', error);
      set({ error: 'Error in communication with server' });
      return { success: false, error: error.message };
    } finally {
      set({ isLoading: false });
      apiCallTracker.endCall(callId);
    }
  }
}));
