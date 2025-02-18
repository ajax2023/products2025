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
  setDoc,
  deleteDoc,
  getDoc
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
  Work as WorkIcon,
} from '@mui/icons-material';
import ProductImport from './ProductImport';
import PriceImport from './PriceImport';

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
  const [showProductImport, setShowProductImport] = useState(false);
  const [showPriceImport, setShowPriceImport] = useState(false);
  const [contributorRequests, setContributorRequests] = useState<any[]>([]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        if (auth.currentUser.email === 'ajax@online101.ca') {
          setCurrentUserRole('super_admin');
          fetchUsers();
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setCurrentUserRole(role);
          if (role === 'super_admin' || role === 'admin') {
            fetchUsers();
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setError('Error checking permissions. Please try again.');
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  useEffect(() => {
    if (currentUserRole === 'super_admin' || currentUserRole === 'admin') {
      // Listen for contributor requests
      const requestsQuery = query(
        collection(db, 'contributorRequests'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        // console.log('Fetched contributor requests:', requests); // Debug log
        setContributorRequests(requests);
      }, (error) => {
        console.error('Error in contributor requests listener:', error);
        setError('Error getting real-time updates for requests.');
      });

      return () => unsubscribe();
    }
  }, [currentUserRole]);

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
      const q = query(
        collection(db, 'users'),
        orderBy('email')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            _id: doc.id,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at,
            last_login: data.last_login?.toDate?.() || data.last_login
          };
        }) as User[];
        
        setUsers(usersList);
        setFilteredUsers(usersList);
        setLoading(false);
      }, (error) => {
        console.error('Error in real-time updates:', error);
        setError('Error getting real-time updates. Please refresh the page.');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error loading users. Please try again.');
      setLoading(false);
    }
  };

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

  const handleContributorRequest = async (requestId: string, userId: string, approved: boolean) => {
    try {
      if (approved) {
        // Update user role to contributor
        await updateDoc(doc(db, 'users', userId), {
          role: 'contributor',
          updated_at: new Date(),
          updated_by: auth.currentUser?.uid
        });
      }

      // Delete the request
      await deleteDoc(doc(db, 'contributorRequests', requestId));

      // Show success message
      setError(approved ? 'User promoted to contributor successfully!' : 'Request denied successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Error handling contributor request:', error);
      setError('Error processing request. Please try again.');
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
    <Box sx={{ width: '85%', position: 'fixed',
      top: 60, 
      left: 0, 
      right: 0, 
      margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        
        
        {/* <Typography variant="h5" component="h5"> */}


        <Typography variant="h6" textAlign="center" color="primary" gutterBottom>
          User Management
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 1, mb: 1 }}>
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

      {/* Contributor Requests Section */}
      {(currentUserRole === 'super_admin' || currentUserRole === 'admin') && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon color="primary" />
            Contributor Requests
            {contributorRequests.length > 0 && (
              <Chip 
                label={contributorRequests.length} 
                color="primary" 
                size="small" 
              />
            )}
          </Typography>
          {contributorRequests.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Current Role</TableCell>
                    <TableCell>Requested At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contributorRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.userName || 'Unknown'}</TableCell>
                      <TableCell>{request.userEmail}</TableCell>
                      <TableCell>{request.currentRole || 'viewer'}</TableCell>
                      <TableCell>
                        {request.createdAt?.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleContributorRequest(request.id, request.userId, true)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleContributorRequest(request.id, request.userId, false)}
                          >
                            Deny
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              No pending contributor requests
            </Paper>
          )}
        </Box>
      )}

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

      <Dialog 
        open={!!editingUser} 
        onClose={() => setEditingUser(null)}
      >
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

      {/* Product Import Dialog */}
      <Dialog
        open={showProductImport}
        onClose={() => setShowProductImport(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Products</DialogTitle>
        <DialogContent>
          <ProductImport onClose={() => setShowProductImport(false)} />
        </DialogContent>
      </Dialog>

      {/* Price Import Dialog */}
      <Dialog
        open={showPriceImport}
        onClose={() => setShowPriceImport(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Prices</DialogTitle>
        <DialogContent>
          <PriceImport onClose={() => setShowPriceImport(false)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
