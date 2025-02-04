// Unsplash API configuration
export const UNSPLASH_CONFIG = {
    ACCESS_KEY: import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '',
    SEARCH_QUERY: 'canadian rockies OR banff OR jasper OR vancouver OR toronto skyline',
    COUNT: 10, // Number of images to fetch at once
};
