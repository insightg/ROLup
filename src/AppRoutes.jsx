// src/AppRoutes.jsx

import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import UserManagement from './components/users/UserManagement';
import GroupManagement from './components/users/GroupManagement';
import UserProfile from './components/auth/UserProfile';
import NotFoundPage from './components/common/NotFoundPage';
import UnauthorizedPage from './components/common/UnauthorizedPage';
import AppContainer from './components/layout/AppContainer';
import TaskTemplatesPage from './components/modules/TaskTemplates/TaskTemplatesPage';
import RouteOptimizerModule from './components/modules/RouteOptimizer';

const AppRoutes = () => {
    console.log('AppRoutes.jsx - URL corrente:', window.location.pathname);

    return (
        <AuthProvider>
            <Routes>
                <Route path="/task-templates" element={<TaskTemplatesPage />} />

                {/* Route pubblica */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Route principali con AppContainer */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <AppContainer />
                    </ProtectedRoute>
                } />
                
                <Route path="/route-optimizer" element={
                    <ProtectedRoute>
                        <AppContainer initialModule="route-optimizer" />
                    </ProtectedRoute>
                } />

                {/* Route per Anagrafica */}
                <Route path="/anagrafica" element={
                    <ProtectedRoute>
                        <AppContainer initialModule="anagrafica" />
                    </ProtectedRoute>
                } />
                
                {/* Route per DashboardPM */}
                <Route path="/dashboard-pm" element={
                    <ProtectedRoute>
                        <AppContainer initialModule="dashboard-pm" />
                    </ProtectedRoute>
                } />
                
                {/* Route per ChatBot */}
                <Route path="/chatbot" element={
                    <ProtectedRoute>
                        <AppContainer initialModule="chatbot" />
                    </ProtectedRoute>
                } />
                
                {/* Route per PickManager */}
                <Route path="/pick-manager" element={
                    <ProtectedRoute>
                        <AppContainer initialModule="pick-manager" />
                    </ProtectedRoute>
                } />
                
                {/* Route protette separate */}
                <Route path="/users" element={
                    <ProtectedRoute requiredPermission="users:view">
                        <UserManagement />
                    </ProtectedRoute>
                } />
                
                <Route path="/groups" element={
                    <ProtectedRoute requiredPermission="groups:view">
                        <GroupManagement />
                    </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <UserProfile />
                    </ProtectedRoute>
                } />
                
                {/* Route di errore */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/not-found" element={<NotFoundPage />} />
                
                {/* Gestione diretta per rotte non definite */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </AuthProvider>
    );
};

export default AppRoutes;