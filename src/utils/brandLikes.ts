import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, increment, Timestamp } from 'firebase/firestore';
import { BrandLike, BrandLikeStats, LikeEvent, LikeAnalytics } from '../types/likes';
import { CanadianProduct } from '../types/product';

// Collection references
const COLLECTION_BRAND_LIKES = 'brandLikes';
const COLLECTION_CANADIAN_PRODUCTS = 'canadian_products';

export class BrandLikesManager {
  // Get or create device ID from local storage
  static getDeviceId(): string {
    const storageKey = 'brand_likes_device_id';
    let deviceId = localStorage.getItem(storageKey);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      console.log('[BrandLikes] Generated new device ID:', deviceId);
      localStorage.setItem(storageKey, deviceId);
    } else {
      console.log('[BrandLikes] Using existing device ID:', deviceId);
    }
    return deviceId;
  }

  // Toggle like status for a brand
  static async toggleLike(
    brandId: string,
    userId?: string
  ): Promise<{ success: boolean; action: 'like' | 'unlike' }> {
    console.log('[BrandLikes] Toggling like:', { brandId, userId });
    
    const deviceId = this.getDeviceId();
    const isAuthenticated = !!userId;

    // Check if already liked
    console.log('[BrandLikes] Checking existing like:', { brandId, userId, deviceId });
    const existingLike = await this.getUserBrandLike(brandId, userId, deviceId);
    
    console.log('[BrandLikes] Existing like check result:', { 
      exists: !!existingLike,
      likeId: existingLike?.id,
      isAuthenticated
    });

    if (existingLike) {
      // Unlike
      console.log('[BrandLikes] Removing like:', existingLike.id);
      await this.removeLike(existingLike.id, brandId);
      return { success: true, action: 'unlike' };
    } else {
      // Like
      console.log('[BrandLikes] Adding new like');
      await this.addLike(brandId, userId, deviceId);
      return { success: true, action: 'like' };
    }
  }

  // Add a new like
  private static async addLike(
    brandId: string,
    userId?: string,
    deviceId?: string
  ): Promise<void> {
    const likeId = crypto.randomUUID();
    const timestamp = Timestamp.now();
    console.log('[BrandLikes] Creating new like:', { likeId, brandId, userId, deviceId });

    // Check for existing likes first
    const existingLike = await this.getUserBrandLike(brandId, userId, deviceId);
    if (existingLike) {
      console.log('[BrandLikes] Like already exists');
      throw new Error('Like already exists for this brand');
    }

    const likeData: BrandLike = {
      id: likeId,
      brandId,
      userId,
      deviceId: deviceId || this.getDeviceId(),
      timestamp,
      isAuthenticated: !!userId,
      active: true,
      metadata: {
        platform: navigator.userAgent,
        referrer: document.referrer || '',
        location: await this.getUserLocation()
      }
    };

    console.log('[BrandLikes] Like data:', likeData);

    // Add like document
    await setDoc(doc(db, COLLECTION_BRAND_LIKES, likeId), likeData);
    console.log('[BrandLikes] Like document created');

    // Update brand stats
    await this.updateBrandLikeStats(brandId, 'increment');
  }

  // Remove a like
  private static async removeLike(likeId: string, brandId: string): Promise<void> {
    console.log('[BrandLikes] Removing like:', likeId);
    await updateDoc(doc(db, COLLECTION_BRAND_LIKES, likeId), { 
      active: false,
      updatedAt: Timestamp.now()
    });
    console.log('[BrandLikes] Like removed');
    await this.updateBrandLikeStats(brandId, 'decrement');
  }

  // Update brand like statistics
  private static async updateBrandLikeStats(
    brandId: string,
    action: 'increment' | 'decrement'
  ): Promise<void> {
    console.log('[BrandLikes] Updating brand stats:', { brandId, action });
    const inc = action === 'increment' ? 1 : -1;
    
    await updateDoc(doc(db, COLLECTION_CANADIAN_PRODUCTS, brandId), {
      'likeStats.totalLikes': increment(inc),
      'likeStats.lastLiked': Timestamp.now()
    });
    console.log('[BrandLikes] Brand stats updated');
  }

  // Get user's like for a specific brand
  private static async getUserBrandLike(
    brandId: string,
    userId?: string,
    deviceId?: string
  ): Promise<BrandLike | null> {
    console.log('[BrandLikes] Getting user brand like:', { brandId, userId, deviceId });
    
    // Always filter by brandId and active status
    const constraints = [
      where('brandId', '==', brandId),
      where('active', '==', true)
    ];
    
    // Add user-specific constraint exactly like the rules
    if (userId) {
      constraints.push(where('userId', '==', userId));
    } else {
      constraints.push(where('deviceId', '==', deviceId || this.getDeviceId()));
    }

    const q = query(collection(db, COLLECTION_BRAND_LIKES), ...constraints);
    const snapshot = await getDocs(q);
    
    console.log('[BrandLikes] User brand like result:', { exists: !snapshot.empty });
    return snapshot.empty ? null : snapshot.docs[0].data() as BrandLike;
  }

  // Get user's location (if available)
  private static async getUserLocation(): Promise<string | undefined> {
    console.log('[BrandLikes] Getting user location');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      console.log('[BrandLikes] User location:', position.coords.latitude, position.coords.longitude);
      return `${position.coords.latitude},${position.coords.longitude}`;
    } catch {
      console.log('[BrandLikes] User location not available');
      return undefined;
    }
  }

  // Get analytics for a brand
  static async getBrandAnalytics(brandId: string): Promise<LikeAnalytics> {
    console.log('[BrandLikes] Getting brand analytics:', brandId);
    const q = query(
      collection(db, COLLECTION_BRAND_LIKES),
      where('brandId', '==', brandId),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const likes = snapshot.docs.map(doc => doc.data() as BrandLike);
    
    console.log('[BrandLikes] Brand analytics result:', likes.length);
    return this.aggregateLikeAnalytics(likes);
  }

  // Aggregate analytics from likes
  private static aggregateLikeAnalytics(likes: BrandLike[]): LikeAnalytics {
    console.log('[BrandLikes] Aggregating like analytics');
    const analytics: LikeAnalytics = {
      totalLikes: likes.length,
      byRegion: {},
      byTimeOfDay: {},
      byDayOfWeek: {},
      topReferrers: {}
    };

    likes.forEach(like => {
      // Region analytics
      if (like.metadata.location) {
        analytics.byRegion[like.metadata.location] = 
          (analytics.byRegion[like.metadata.location] || 0) + 1;
      }

      // Time analytics
      const date = like.timestamp.toDate();
      const hour = date.getHours().toString();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      analytics.byTimeOfDay[hour] = (analytics.byTimeOfDay[hour] || 0) + 1;
      analytics.byDayOfWeek[day] = (analytics.byDayOfWeek[day] || 0) + 1;

      // Referrer analytics
      if (like.metadata.referrer) {
        analytics.topReferrers[like.metadata.referrer] = 
          (analytics.topReferrers[like.metadata.referrer] || 0) + 1;
      }
    });

    console.log('[BrandLikes] Like analytics aggregated');
    return analytics;
  }
}
