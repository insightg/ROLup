import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  TableContainer, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Tooltip,
  Checkbox,
  Button,
  FormControl,
  InputLabel,
  Select,
  Popover,
  Typography,
  Badge,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Assignment as TasksIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  SupervisorAccount as ManagerIcon,
  FilterList as FilterListIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  CheckBox as CheckBoxIcon,
  Save as SaveIcon,
  People as PeopleIcon,
  Route as RouteIcon
} from '@mui/icons-material';
import { usePMStore } from '../stores/pmStore';
import OrderDetailPanel from './OrderDetailPanel';
import StatusPanel from './StatusPanel';
import DocumentsPanel from './DocumentsPanel';
import AssignPMPanel from './AssignPMPanel';
import RouteOptimizerDialog from './RouteOptimizerDialog';
import { useNavigate } from 'react-router-dom';

