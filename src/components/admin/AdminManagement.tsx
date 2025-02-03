import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { AdminUser, AdminRole } from '../../types/admin';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';

interface AdminManagementProps {
  currentAdmin: AdminUser;
}

const ADMIN_ROLES: AdminRole[] = [
  'super_admin',
  'product_admin',
  'company_admin',
  'price_admin'
];

export default function AdminManagement({ currentAdmin }: AdminManagementProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<AdminUser | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<Partial<AdminUser>>({
    user_id: '',
    roles: [],
    status: 'active'
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const q = query(collection(db, 'admins'));
      const querySnapshot = await getDocs(q);
      const adminsList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        _id: doc.id
      })) as AdminUser[];
      setAdmins(adminsList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError('Error loading admins');
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newAdmin: AdminUser = {
        _id: `admin_${Date.now()}`,
        user_id: formData.user_id!,
        roles: formData.roles || [],
        created_at: new Date(),
        created_by: currentAdmin.user_id,
        updated_at: new Date(),
        status: formData.status || 'active'
      };

      await setDoc(doc(db, 'admins', newAdmin._id), newAdmin);
      await fetchAdmins();
      setCreateDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error creating admin:', err);
      setError('Error creating admin');
    }
  };

  const handleEdit = async () => {
    if (!editDialog) return;

    try {
      const updatedAdmin = {
        ...formData,
        updated_at: new Date()
      };

      await updateDoc(doc(db, 'admins', editDialog._id), updatedAdmin);
      await fetchAdmins();
      setEditDialog(null);
      resetForm();
    } catch (err) {
      console.error('Error updating admin:', err);
      setError('Error updating admin');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      await deleteDoc(doc(db, 'admins', deleteDialog._id));
      await fetchAdmins();
      setDeleteDialog(null);
    } catch (err) {
      console.error('Error deleting admin:', err);
      setError('Error deleting admin');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      roles: [],
      status: 'active'
    });
  };

  const toggleRole = (role: AdminRole) => {
    setFormData(prev => {
      const currentRoles = prev.roles || [];
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
      return { ...prev, roles: newRoles };
    });
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading admins...</Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const AdminForm = () => (
    <Stack spacing={2}>
      <TextField
        label="User ID"
        value={formData.user_id || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
        fullWidth
        required
        helperText="Enter the Firebase Auth User ID"
      />

      <Typography variant="subtitle2" gutterBottom>Roles</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {ADMIN_ROLES.map(role => (
          <Chip
            key={role}
            label={role}
            onClick={() => toggleRole(role)}
            color={(formData.roles || []).includes(role) ? 'primary' : 'default'}
            variant={(formData.roles || []).includes(role) ? 'filled' : 'outlined'}
            sx={{ textTransform: 'capitalize' }}
          />
        ))}
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={formData.status === 'active'}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              status: e.target.checked ? 'active' : 'inactive'
            }))}
          />
        }
        label="Active"
      />
    </Stack>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Admin Management
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          onClick={() => {
            resetForm();
            setCreateDialog(true);
          }}
        >
          Add Admin
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User ID</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.map((admin) => (
              <TableRow 
                key={admin._id}
                sx={admin.status === 'inactive' ? { opacity: 0.5 } : undefined}
              >
                <TableCell>{admin.user_id}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {admin.roles.map(role => (
                      <Chip
                        key={role}
                        label={role}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={admin.status}
                    color={admin.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{admin.created_by}</TableCell>
                <TableCell>
                  {admin.created_at.toDate().toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFormData(admin);
                        setEditDialog(admin);
                      }}
                      disabled={admin._id === currentAdmin._id}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog(admin)}
                      disabled={admin._id === currentAdmin._id}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <AdminForm />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!formData.user_id || !(formData.roles || []).length}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editDialog}
        onClose={() => setEditDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <AdminForm />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={!formData.user_id || !(formData.roles || []).length}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
      >
        <DialogTitle>Delete Admin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove admin privileges from {deleteDialog?.user_id}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
          >
            Remove Admin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
