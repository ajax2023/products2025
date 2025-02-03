import { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  updateDoc,
  doc,
  where,
  orderBy,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { User } from '../../types/user';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  TextField,
  InputAdornment,
  TablePagination,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

const ROLES = ['super_admin', 'admin', 'contributor', 'viewer'] as const;
const USER_STATUSES = ['active', 'inactive', 'pending'] as const;

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!auth.currentUser) return;

      if (auth.currentUser.email === 'ajax@online101.ca') {
        setCurrentUserRole('super_admin');
        fetchUsers();
        return;
      }
      
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('_id', '==', auth.currentUser.uid))
      );
      
      if (!userDoc.empty) {
        setCurrentUserRole(userDoc.docs[0].data().role);
      }
    };

    checkUserRole();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
    setPage(0); // Reset to first page when filters change
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Listen for real-time updates to the users collection
      const q = query(
        collection(db, 'users'),
        orderBy('email')
      );
      
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        _id: doc.id,
        // Convert Firestore Timestamps to Dates
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate(),
        last_login: doc.data().last_login?.toDate()
      })) as User[];
      
      console.log('Fetched users:', usersList); // Debug log
      setUsers(usersList);
      setFilteredUsers(usersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error loading users. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole === 'super_admin') {
      const q = query(collection(db, 'users'), orderBy('email'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          ...doc.data(),
          _id: doc.id,
          created_at: doc.data().created_at?.toDate(),
          updated_at: doc.data().updated_at?.toDate(),
          last_login: doc.data().last_login?.toDate()
        })) as User[];
        setUsers(usersList);
        setFilteredUsers(usersList);
      }, (error) => {
        console.error('Error in real-time updates:', error);
        setError('Error getting real-time updates. Please refresh the page.');
      });

      return () => unsubscribe();
    }
  }, [currentUserRole]);

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (currentUserRole !== 'super_admin' && editingUser.role === 'admin') {
      setError('Only super admins can modify admin roles');
      return;
    }

    if (editingUser.role === 'super_admin') {
      setError('Super admin role cannot be modified');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', editingUser._id), {
        role: editingUser.role,
        status: editingUser.status,
        updated_at: new Date(),
        updated_by: auth.currentUser?.uid,
      });
      await fetchUsers();
      setEditingUser(null);
      setError(null);
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Error updating user. Please try again.');
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'secondary';
      case 'admin':
        return 'error';
      case 'contributor':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access this page. Please contact an administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        User Management
      </Typography>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              label="Role"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              {USER_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              size="small"
            >
              Clear Filters
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredUsers.length} of {users.length} users
      </Typography>
      
      <Paper elevation={0}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Display Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.displayName || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      size="small"
                      color={getRoleColor(user.role)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      size="small"
                      color={getStatusColor(user.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit User">
                      <IconButton
                        size="small"
                        onClick={() => setEditingUser(user)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Dialog open={!!editingUser} onClose={() => setEditingUser(null)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {editingUser?.email}
            </Typography>
            
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={editingUser?.role || ''}
                label="Role"
                onChange={(e) => setEditingUser(prev => 
                  prev ? { ...prev, role: e.target.value as User['role'] } : null
                )}
                disabled={
                  editingUser?.role === 'super_admin' || 
                  (currentUserRole !== 'super_admin' && editingUser?.role === 'admin')
                }
              >
                {ROLES.filter(role => {
                  if (currentUserRole !== 'super_admin') {
                    return role !== 'super_admin' && role !== 'admin';
                  }
                  return role !== 'super_admin';
                }).map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={editingUser?.status || ''}
                label="Status"
                onChange={(e) => setEditingUser(prev => 
                  prev ? { ...prev, status: e.target.value as User['status'] } : null
                )}
              >
                {USER_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
