import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Skeleton,
  Alert,
  Button
} from '@mui/material';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { User } from '../types/user';
import { UserStats } from '../types/userStats';
import { useAuth } from '../auth';
import { getAuth, getUser } from 'firebase/auth';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL: string | null;
  email: string;
  totalProducts: number;
  lastContribution: any | null;  // Using any for Firestore Timestamp
}

export default function Leaderboard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refreshAllUserStats = async () => {
      if (!user) return;
      
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnapshot.docs) {
          await updateUserStats(userDoc.id);
        }
      } catch (err) {
        console.error('Error refreshing user stats:', err);
      }
    };
    
    refreshAllUserStats();
  }, [user]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (authLoading) return;
      
      if (!user) {
        setError('Please log in to view the leaderboard');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get all products to count them directly
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsByUser = new Map<string, number>();
        const lastContributionByUser = new Map<string, string>();
        
        productsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const userId = data.created_by;
          if (userId) {
            productsByUser.set(userId, (productsByUser.get(userId) || 0) + 1);
            const createdAt = data.created_at;
            if (createdAt) {
              const currentLastContribution = lastContributionByUser.get(userId);
              if (!currentLastContribution || createdAt > currentLastContribution) {
                lastContributionByUser.set(userId, createdAt);
              }
            }
          }
        });

        // Get all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const leaderboardPromises = usersSnapshot.docs.map(async doc => {
          const userData = doc.data();
          const userId = doc.id;
          const totalProducts = productsByUser.get(userId) || 0;
          
          // Try to get the user's auth profile for the photo
          let photoURL = null;
          try {
            const userRecord = await getDoc(doc(db, 'users', userId));
            if (userRecord.exists()) {
              const userData = userRecord.data();
              photoURL = userData.photoURL || null;
              
              // If no photoURL in Firestore, try to get it from auth profile
              if (!photoURL) {
                const auth = getAuth();
                const currentUser = auth.currentUser;
                if (currentUser && currentUser.uid === userId) {
                  photoURL = currentUser.photoURL;
                }
              }
            }
          } catch (err) {
            console.error('Error getting user photo:', err);
          }

          return {
            userId,
            displayName: userData.displayName || 'Anonymous',
            photoURL,
            email: userData.email || '',
            totalProducts,
            lastContribution: lastContributionByUser.get(userId) || null
          };
        });

        const leaderboardData = (await Promise.all(leaderboardPromises))
          .filter(entry => entry.totalProducts > 0)
          .sort((a, b) => b.totalProducts - a.totalProducts);

        console.log('Leaderboard data:', leaderboardData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <Box sx={{ p: 1, maxWidth: 900, margin: '0 auto' }}>
        <Typography variant="h5" gutterBottom>
          Top Contributors
        </Typography>
        <Paper elevation={10}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell align="right">Products Added</TableCell>
                  <TableCell align="right">Last Contribution</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={150} />
                      </Box>
                    </TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={50} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={100} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 1, maxWidth: 900, margin: '0 auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, maxWidth: 900, margin: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        Top Contributors
      </Typography>
      <Paper elevation={10}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell align="right">Products Added</TableCell>
                <TableCell align="right">Last Contribution</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow key={entry.userId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={entry.photoURL || undefined} 
                        alt={entry.displayName}
                        sx={{ 
                          width: 40, 
                          height: 40,
                          bgcolor: !entry.photoURL ? `#${Math.floor(Math.random()*16777215).toString(16)}` : undefined
                        }}
                      >
                        {entry.displayName[0]?.toUpperCase()}
                      </Avatar>
                      <Typography>{entry.displayName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{entry.totalProducts}</TableCell>
                  <TableCell align="right">
                    {entry.lastContribution ? new Date(entry.lastContribution.seconds * 1000).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }) : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
              {leaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No contributors found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
