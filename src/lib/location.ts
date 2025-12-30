/**
 * Location utility functions for clock in/out system
 */

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: Date;
  address?: string;
  error?: string;
}

export interface SystemLocationData {
  timezone: string;
  timezoneOffset: number;
  language: string;
  userAgent: string;
  platform: string;
  ipAddress?: string;
  timestamp: Date;
}

/**
 * Get the user's GPS location using the browser's Geolocation API
 */
export const getEmployeeLocation = (): Promise<LocationData> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: new Date(),
        error: 'Geolocation is not supported by this browser',
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 0, // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        });
      },
      (error) => {
        // Handle geolocation errors gracefully without logging to console
        // This prevents "Position update is unavailable" from cluttering the console
        let errorMessage = 'Location information is unavailable';
        
        // Handle error codes (numeric values)
        if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
          errorMessage = 'User denied the request for Geolocation';
        } else if (error.code === 2 || error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information is unavailable';
        } else if (error.code === 3 || error.code === error.TIMEOUT) {
          errorMessage = 'The request to get user location timed out';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // Resolve with error instead of rejecting to prevent unhandled promise rejections
        // This prevents console errors from appearing
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          timestamp: new Date(),
          error: errorMessage,
        });
      },
      options
    );
  });
};

/**
 * Get system location information (timezone, language, etc.)
 */
export const getSystemLocation = (): SystemLocationData => {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language || 'en-US',
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'unknown',
    timestamp: new Date(),
  };
};

/**
 * Get both employee GPS location and system location
 */
export const getAllLocationData = async (): Promise<{
  employeeLocation: LocationData;
  systemLocation: SystemLocationData;
}> => {
  const employeeLocation = await getEmployeeLocation();
  const systemLocation = getSystemLocation();

  return {
    employeeLocation,
    systemLocation,
  };
};

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Returns distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if a location is within a specified radius (in meters) of a reference location
 */
export const isWithinRadius = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusMeters: number
): boolean => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= radiusMeters;
};
