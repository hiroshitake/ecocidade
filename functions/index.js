const functions = require('firebase-functions');
const fetch = require('node-fetch');

const PLACES_URL_AUTOCOMPLETE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACES_URL_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

function makeUrl(base, params) {
  const parts = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`);
  return `${base}?${parts.join('&')}`;
}

exports.placesAutocomplete = functions.https.onCall(async (data, context) => {
  const input = (data && data.input) || '';
  const sessiontoken = data && data.sessiontoken ? data.sessiontoken : undefined;
  if (!input) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing input');
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Server missing Places API key');
  }

  const params = { input, key: apiKey, components: 'country:br', types: 'geocode' };
  if (sessiontoken) params.sessiontoken = sessiontoken;

  const url = makeUrl(PLACES_URL_AUTOCOMPLETE, params);

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' || json.status === 'ZERO_RESULTS') {
      return { predictions: json.predictions || [] };
    }
    throw new functions.https.HttpsError('internal', json.error_message || json.status);
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Places autocomplete failed');
  }
});

exports.placesDetails = functions.https.onCall(async (data, context) => {
  const placeId = (data && data.placeId) || '';
  const sessiontoken = data && data.sessiontoken ? data.sessiontoken : undefined;
  if (!placeId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing placeId');
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Server missing Places API key');
  }

  const params = { place_id: placeId, key: apiKey, fields: 'geometry,formatted_address' };
  if (sessiontoken) params.sessiontoken = sessiontoken;

  const url = makeUrl(PLACES_URL_DETAILS, params);
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.result) {
      const loc = json.result.geometry && json.result.geometry.location;
      return { result: json.result, location: loc };
    }
    throw new functions.https.HttpsError('internal', json.error_message || json.status);
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Places details failed');
  }
});
