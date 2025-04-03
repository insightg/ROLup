// src/components/modules/UserManagement/stores/userManagementStore.js
import { create } from 'zustand';
import apiUtils from '../../../../utils/apiUtils';

/**
 * Store per la gestione degli utenti e dei gruppi
 */
export const useUserManagementStore = create((set, get) => ({
  // Stato
  users: [],
  groups: [],
  permissions: [],
  menuItems: [],
  isLoading: false,
  error: null,
  
  // Azioni per gli utenti
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.get('backend/r_users.php?action=getUsers');
      
      if (result.success) {
        set({ users: result.data || [] });
      } else {
        set({ error: result.error || 'Errore nel caricamento degli utenti' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=createUser', userData);
      
      if (result.success) {
        const currentUsers = get().users;
        set({ users: [...currentUsers, result.data] });
        return { success: true, data: result.data };
      } else {
        set({ error: result.error || 'Errore nella creazione dell\'utente' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error creating user:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateUser: async (userId, userData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=updateUser', { id: userId, ...userData });
      
      if (result.success) {
        const currentUsers = get().users;
        const updatedUsers = currentUsers.map(user => 
          user.id === userId ? { ...user, ...userData } : user
        );
        set({ users: updatedUsers });
        return { success: true };
      } else {
        set({ error: result.error || 'Errore nell\'aggiornamento dell\'utente' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error updating user:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=deleteUser', { id: userId });
      
      if (result.success) {
        const currentUsers = get().users;
        const updatedUsers = currentUsers.filter(user => user.id !== userId);
        set({ users: updatedUsers });
        return { success: true };
      } else {
        set({ error: result.error || 'Errore nella cancellazione dell\'utente' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Azioni per i gruppi
  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.get('backend/r_users.php?action=getGroups');
      
      if (result.success) {
        set({ groups: result.data || [] });
      } else {
        set({ error: result.error || 'Errore nel caricamento dei gruppi' });
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  createGroup: async (groupData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=createGroup', groupData);
      
      if (result.success) {
        const currentGroups = get().groups;
        set({ groups: [...currentGroups, result.data] });
        return { success: true, data: result.data };
      } else {
        set({ error: result.error || 'Errore nella creazione del gruppo' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error creating group:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateGroup: async (groupId, groupData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=updateGroup', { id: groupId, ...groupData });
      
      if (result.success) {
        const currentGroups = get().groups;
        const updatedGroups = currentGroups.map(group => 
          group.id === groupId ? { ...group, ...groupData } : group
        );
        set({ groups: updatedGroups });
        return { success: true };
      } else {
        set({ error: result.error || 'Errore nell\'aggiornamento del gruppo' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error updating group:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteGroup: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=deleteGroup', { id: groupId });
      
      if (result.success) {
        const currentGroups = get().groups;
        const updatedGroups = currentGroups.filter(group => group.id !== groupId);
        set({ groups: updatedGroups });
        return { success: true };
      } else {
        set({ error: result.error || 'Errore nella cancellazione del gruppo' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Azioni per i menu e i permessi
  fetchMenuItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const menuResult = await apiUtils.get('backend/r_users.php?action=getMenuItems');
      const permissionsResult = await apiUtils.get('backend/r_users.php?action=getPermissions');
      
      if (menuResult.success && permissionsResult.success) {
        set({ 
          menuItems: menuResult.data || [],
          permissions: permissionsResult.data || []
        });
      } else {
        set({ error: menuResult.error || permissionsResult.error || 'Errore nel caricamento dei menu e permessi' });
      }
    } catch (error) {
      console.error('Error fetching menu items and permissions:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  updatePermission: async (permissionData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=updatePermission', permissionData);
      
      if (result.success) {
        // Aggiorna lo stato dei permessi
        await get().fetchPermissions();
        return { success: true };
      } else {
        set({ error: result.error || 'Errore nell\'aggiornamento del permesso' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Azione per aggiungere/rimuovere utenti dai gruppi
  updateUserGroups: async (userId, groupIds) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUtils.post('backend/r_users.php?action=updateUserGroups', { userId, groupIds });
      
      if (result.success) {
        // Aggiorniamo l'utente localmente
        const currentUsers = get().users;
        const updatedUsers = currentUsers.map(user => {
          if (user.id === userId) {
            return { ...user, groups: groupIds }; // Aggiorna i gruppi dell'utente
          }
          return user;
        });
        
        set({ users: updatedUsers });
        return { success: true };
      } else {
        set({ error: result.error || 'Errore nell\'aggiornamento dei gruppi dell\'utente' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error updating user groups:', error);
      set({ error: 'Errore nella comunicazione con il server' });
      return { success: false, error: 'Errore nella comunicazione con il server' };
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Azione per aggiornare tutti i dati
  refreshData: async () => {
    try {
      await get().fetchUsers();
      await get().fetchGroups();
      await get().fetchMenuItems(); // Cambiato da fetchPermissions a fetchMenuItems, che recupera entrambi
    } catch (error) {
      console.error('Error refreshing data:', error);
      set({ error: 'Errore nell\'aggiornamento dei dati' });
    }
  }
}));