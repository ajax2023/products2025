import { Timestamp } from 'firebase/firestore';

export interface BrandLike {
  id: string;
  brandId: string;        // ID of the CanadianProduct (brand)
  userId?: string;        // For authenticated users
  deviceId: string;       // For anonymous users
  timestamp: Timestamp;
  isAuthenticated: boolean;
  active: boolean;        // For soft deletes
  metadata: {
    platform: string;     // Browser/device info
    referrer: string;     // Traffic source
    location?: string;    // Geographic location
  }
}

export interface BrandLikeStats {
  totalLikes: number;
  authenticatedLikes: number;
  anonymousLikes: number;
  lastLiked: Timestamp;
  trending?: boolean;     // Based on like velocity
  weeklyTrend?: number;   // Percentage change in last 7 days
  monthlyTrend?: number;  // Percentage change in last 30 days
}

// For aggregating likes data
export interface LikeAnalytics {
  totalLikes: number;
  byRegion: { [region: string]: number };
  byTimeOfDay: { [hour: string]: number };
  byDayOfWeek: { [day: string]: number };
  topReferrers: { [referrer: string]: number };
  conversionRate?: number;  // Percentage of likes leading to website visits
}

// For tracking like events
export interface LikeEvent {
  type: 'like' | 'unlike';
  timestamp: Timestamp;
  brandId: string;
  userId?: string;
  deviceId: string;
  metadata: BrandLike['metadata'];
}
