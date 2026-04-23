const { 
  LocationClient, 
  SearchPlaceIndexForTextCommand,
  CalculateRouteCommand 
} = require("@aws-sdk/client-location");

// AWS Location Client config
const client = new LocationClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const PLACE_INDEX_NAME = process.env.AWS_PLACE_INDEX_NAME || 'MapPlaceIndex';
const ROUTE_CALCULATOR_NAME = process.env.AWS_ROUTE_CALCULATOR_NAME || 'MapRouteCalculator';

async function searchPlaces(req, res, next) {
  try {
    const { query = '', lat, lng, radius = 5000 } = req.query;

    if (!query.trim()) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    let command;
    if (lat && lng) {
      // bias towards position
      command = new SearchPlaceIndexForTextCommand({
        IndexName: PLACE_INDEX_NAME,
        Text: query,
        BiasPosition: [Number(lng), Number(lat)],
        MaxResults: 20
      });
    } else {
      command = new SearchPlaceIndexForTextCommand({
        IndexName: PLACE_INDEX_NAME,
        Text: query,
        MaxResults: 20
      });
    }

    const data = await client.send(command);

    const places = (data.Results || []).map(r => {
      const p = r.Place;
      return {
        placeId: p.PlaceId || Math.random().toString(), 
        name: p.Label ? p.Label.split(',')[0] : 'Unknown Place',
        address: p.Label,
        lat: p.Geometry.Point[1],
        lng: p.Geometry.Point[0],
        // Mock fields to keep frontend compatible
        rating: 4.5,
        isOpen: true
      };
    });

    res.json({ places, total: places.length });
  } catch (err) {
    next(err);
  }
}

async function getDirections(req, res, next) {
  try {
    const { origin, destination, mode = 'driving' } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: '"origin" and "destination" are required' });
    }

    // Convert "lat,lng" string to [lng, lat] array
    const parsePosition = (str) => {
      const parts = str.split(',');
      if (parts.length === 2) {
        return [Number(parts[1].trim()), Number(parts[0].trim())]; 
      }
      return null;
    };

    const depPos = parsePosition(origin);
    const destPos = parsePosition(destination);

    if (!depPos || !destPos) {
        return res.status(400).json({ error: 'origin and destination must be in "lat,lng" format' });
    }

    const command = new CalculateRouteCommand({
      CalculatorName: ROUTE_CALCULATOR_NAME,
      DeparturePosition: depPos,
      DestinationPosition: destPos,
      TravelMode: mode === 'walking' ? 'Walking' : 'Car', // Map to AWS modes
      IncludeLegGeometry: true
    });

    const data = await client.send(command);

    if (!data.Legs || data.Legs.length === 0) {
        return res.status(404).json({ error: 'No route found' });
    }

    const leg = data.Legs[0];
    
    res.json({
      distance: { text: `${leg.Distance.toFixed(2)} km`, value: leg.Distance * 1000 },
      duration: { text: `${Math.round(leg.DurationSeconds / 60)} phút`, value: leg.DurationSeconds },
      startAddress: "Departure",
      endAddress: "Destination",
      steps: leg.Steps.map(s => ({
        instruction: "Tiếp tục đi thẳng", 
        distance: { value: s.Distance * 1000 },
        duration: { value: s.DurationSeconds },
        mode: mode
      })),
      // Geometry for drawing
      geometry: leg.Geometry.LineString 
    });
  } catch (err) {
    next(err);
  }
}

async function getPlaceDetails(req, res, next) {
   // AWS Location service places index doesn't have a direct "details by ID" equivalent
   res.status(501).json({ error: 'Not implemented for AWS Location Service' });
}

module.exports = { searchPlaces, getDirections, getPlaceDetails };
