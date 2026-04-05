const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

const FALLBACK_TYPES = ['bar', 'restaurant', 'cafe', 'night_club'];

const normalizePlace = (place) => ({
  name: place.displayName?.text || place.formattedAddress || 'Current Location',
  address: place.formattedAddress || '',
  primaryType: place.primaryType || '',
  source: 'google-places',
});

export const hasGooglePlacesConfig = () => Boolean(GOOGLE_PLACES_API_KEY);

export async function lookupNearbyVenue(coords, options = {}) {
  if (!GOOGLE_PLACES_API_KEY || !coords) {
    return null;
  }

  const radius = options.radius ?? 150;
  const includedTypes = options.includedTypes ?? FALLBACK_TYPES;

  const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.primaryType',
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 5,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: {
            latitude: coords.lat,
            longitude: coords.lng,
          },
          radius,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places lookup failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const firstPlace = payload.places?.[0];
  return firstPlace ? normalizePlace(firstPlace) : null;
}
