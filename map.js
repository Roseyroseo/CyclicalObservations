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

//shared style object (2.3 optional)
const bikeLaneStyle = {
    'line-color': '#32D400', // A bright green using hex code
    'line-width': 3, // Thicker lines
    'line-opacity': 0.4 // Slightly less transparent
};

//helper function for station objects coordinate conversion
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point); // Project to pixel coordinates
    return { cx: x, cy: y }; // Return as object for use in SVG attributes
} 

// Draws the map
map.on('load', () => {
    // Select the SVG inside #map
    const svg = d3.select('#map').select('svg'); 
    let stations = []; // Initialize an empty array

    // 3.1 Fetching and parsing the Bluebikes station data
    // Load the nested JSON file
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

    d3.json(jsonurl).then(jsonData => {
        console.log('Loaded JSON Data:', jsonData);  // Log to verify JSON structure
        const stations = jsonData.data.stations;
        console.log('Stations Array:', stations);  // Log the extracted stations array

        // Append circles to the SVG for each station (3.3)
        const circles = svg.selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5)               // Radius of the circle
        .attr('fill', 'steelblue')  // Circle fill color
        .attr('stroke', 'white')    // Circle border color
        .attr('stroke-width', 1)    // Circle border thickness
        .attr('opacity', 0.8);      // Circle opacity

        // Function to update circle positions when the map moves/zooms
        function updatePositions() {
            circles
            .attr('cx', d => getCoords(d).cx)  // Set x-position using projected coordinates
            .attr('cy', d => getCoords(d).cy); // Set y-position using projected coordinates
        }

        // Initial position update when the map loads
        updatePositions();

        // Reposition markers on map interactions
        map.on('move', updatePositions);     // Update during map movement
        map.on('zoom', updatePositions);     // Update during zooming
        map.on('resize', updatePositions);   // Update on window resize
        map.on('moveend', updatePositions);  // Final adjustment after movement ends
    
    
    }).catch(error => {
        console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
    });



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

    // 2.3: add cambridge route
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