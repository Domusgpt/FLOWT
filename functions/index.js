const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

/**
 * Validate request payload for the ride creation.
 * @param {Object} data Incoming request data
 * @return {{pickup: string, dropoff: string, boatType: string}}
 */
function validateRideRequest(data) {
  const pickup = data?.pickup?.trim();
  const dropoff = data?.dropoff?.trim();
  const boatType = data?.boatType?.trim();

  if (!pickup || !dropoff || !boatType) {
    throw new HttpsError('invalid-argument',
        'Missing ride details. Please provide pickup location, dropoff location, and boat type.');
  }

  return {pickup, dropoff, boatType};
}

/**
 * Create a ride document in Firestore.
 * @param {Object} ride Ride details including passengerId, pickup, dropoff and boatType
 * @return {Promise<string>} The ID of the created ride document
 */
async function createRide({passengerId, pickup, dropoff, boatType}) {
  const rideRef = db.collection('rides').doc();
  await rideRef.set({
    passengerId,
    pickupLocation: pickup,
    dropoffLocation: dropoff,
    boatType,
    status: 'pending',
    timestamp: FieldValue.serverTimestamp(),
  });
  return rideRef.id;
}

exports.requestRide = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated',
        'The function must be called while authenticated.');
  }
  const passengerId = request.auth.uid;
  const rideDetails = validateRideRequest(request.data);
  const rideId = await createRide({passengerId, ...rideDetails});
  logger.info('New ride request', {rideId, passengerId, ...rideDetails});
  return {rideId, message: 'Ride request submitted successfully!'};
});
