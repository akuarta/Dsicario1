import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const RIDER_LOCATIONS_COLLECTION = 'riderLocations';

/**
 * Write rider GPS to Firestore.
 */
export const updateRiderLocation = async (riderId, latitude, longitude, orderId = null) => {
  if (!riderId || !latitude || !longitude) return;
  try {
    await setDoc(doc(db, RIDER_LOCATIONS_COLLECTION, riderId), {
      latitude,
      longitude,
      orderId,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[LocationService] Error writing location:', e.message);
  }
};

/**
 * Subscribe to rider real-time location.
 * Returns unsubscribe function. Callback receives { latitude, longitude, orderId } or null.
 */
export const subscribeToRiderLocation = (riderId, callback) => {
  if (!riderId) {
    callback(null);
    return () => {};
  }

  const unsub = onSnapshot(
    doc(db, RIDER_LOCATIONS_COLLECTION, riderId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          latitude: data.latitude,
          longitude: data.longitude,
          orderId: data.orderId,
          updatedAt: data.updatedAt,
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('[LocationService] Snapshot error:', error.message);
      callback(null);
    }
  );

  return unsub;
};
