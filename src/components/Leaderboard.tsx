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
  Skeleton
} from '@mui/material';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User } from '../types/user';
import { UserStats } from '../types/userStats';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  email: string;
  totalProducts: number;
  lastContribution: Date | null;
}

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all users who opted into the leaderboard
        const userSettingsQuery = query(collection(db, 'userSettings'));
        const userSettingsSnapshot = await getDocs(userSettingsQuery);
        console.log('User settings found:', userSettingsSnapshot.size);
        
        // Get eligible users and their settings
        const eligibleUserIds = userSettingsSnapshot.docs
          .filter(doc => doc.data().sharing?.showOnLeaderboard)
          .map(doc => doc.id);
        console.log('Eligible user IDs:', eligibleUserIds);

        // Get user info from users collection
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('_id', 'in', eligibleUserIds))
        );
        console.log('Users found:', usersSnapshot.size);

        const userMap = new Map(
          usersSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log('User data:', doc.id, data);
            return [doc.id, {
              displayName: data.name || data.email || 'Anonymous User',
              photoURL: data.photoURL || null,
              email: data.email
            }];
          })
        );

        // Get stats for eligible users
        const statsQuery = query(collection(db, 'user_stats'));
        const statsSnapshot = await getDocs(statsQuery);
        console.log('Stats found:', statsSnapshot.size);
        
        const statsMap = new Map(
          statsSnapshot.docs.map(doc => {
            console.log('User stats:', doc.id, doc.data());
            return [doc.id, doc.data()];
          })
        );

        // Combine user data with their stats
        const leaderboardData = eligibleUserIds
          .map(userId => {
            const user = userMap.get(userId);
            const stats = statsMap.get(userId);
            return {
              userId,
              displayName: user?.displayName || 'Anonymous User',
              photoURL: user?.photoURL,
              email: user?.email,
              totalProducts: stats?.total_products || 0,
              lastContribution: stats?.last_contribution?.toDate() || null
            };
          })
          .sort((a, b) => b.totalProducts - a.totalProducts);
        console.log('Final leaderboard data:', leaderboardData);

        setLeaderboard(leaderboardData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Failed to load leaderboard data');
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Top Contributors
      </Typography>
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Contributor</TableCell>
                <TableCell align="right">Products Added</TableCell>
                <TableCell align="right">Last Contribution</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : (
                leaderboard.map((entry, index) => (
                  <TableRow key={entry.userId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={entry.photoURL}
                          sx={{ width: 32, height: 32 }}
                        >
                          {entry.displayName[0]}
                        </Avatar>
                        {entry.displayName}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{entry.totalProducts}</TableCell>
                    <TableCell align="right">
                      {entry.lastContribution
                        ? new Date(entry.lastContribution).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
