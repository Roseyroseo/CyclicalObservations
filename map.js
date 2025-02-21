// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9zZXlyb3NlbyIsImEiOiJjbTdlMjN1NnowOWoyMnFwdXBkZmRib3h1In0.PcCswgFmZi5pYmeOrMO-ow';

// Initialize the map
const map = new mapboxgl.Map({
   container: 'map', // ID of the div where the map will render
   style: 'mapbox://styles/mapbox/light-v11', // Map style
   center: [-71.09415, 42.36027], // [longitude, latitude]
   zoom: 12, // Initial zoom level
   minZoom: 5, // Minimum allowed zoom
   maxZoom: 18 // Maximum allowed zoom
});

//shared style object
const bikeLaneStyle = {
    'line-color': '#32D400', // A bright green using hex code
    'line-width': 3, // Thicker lines
    'line-opacity': 0.4 // Slightly less transparent
};

map.on('load', () => {
    // 2.1: add the bike lanes data source
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });
  
    // 2.2: add a new layer to visualize the bike lanes
    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: bikeLaneStyle // reference shared style object          
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: bikeLaneStyle // reference shared style object
    });

});