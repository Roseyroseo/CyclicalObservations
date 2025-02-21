// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9zZXlyb3NlbyIsImEiOiJjbTdlMjN1NnowOWoyMnFwdXBkZmRib3h1In0.PcCswgFmZi5pYmeOrMO-ow';

// Step 5.2: Create a variable to hold the time filter value
let timeFilter = -1;

// Select slider and display elements
const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

let filteredTrips = [];
let filteredArrivals = new Map();
let filteredDepartures = new Map();
let filteredStations = [];


// Initialize the map
const map = new mapboxgl.Map({
   container: 'map',
   style: 'mapbox://styles/mapbox/light-v11',
   center: [-71.09415, 42.36027],
   zoom: 12,
   minZoom: 5,
   maxZoom: 18
});

// Shared style object for bike lanes
const bikeLaneStyle = {
    'line-color': '#32D400',
    'line-width': 3,
    'line-opacity': 0.4
};

const tooltip = d3.select("#tooltip");

// Helper function to convert coordinates
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

// Select the SVG inside #map
const svg = d3.select('#map').select('svg');
let stations = []; // Initialize an empty array

// Step 3.1: Fetching and parsing the Bluebikes station data
const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

d3.json(jsonurl).then(jsonData => {
    console.log('Loaded JSON Data:', jsonData);

    // Assign station data
    stations = jsonData.data.stations.map(station => ({
        ...station,
        arrivals: 0,
        departures: 0,
        totalTraffic: 0
    }));

    // Step 4.1: Fetching the Bluebikes traffic data **AFTER** stations are loaded
    const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

    d3.csv(trafficUrl).then(trafficData => {
        console.log('Loaded Traffic Data:', trafficData);
        const trips = trafficData; 

        // Step 4.2: Calculate departures & arrivals at each station
        const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
        const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

        // Update stations with traffic data
        stations = stations.map(station => {
            let id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.arrivals + station.departures;
            return station;
        });

        console.log('Updated Stations with Traffic Data:', stations);

        // Step 4.3: Define a square root scale for circle radius
        const radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(stations, d => d.totalTraffic)])
            .range([0, 25]);

        // Step 3.3: Append circles to the SVG for each station
        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', d => radiusScale(d.totalTraffic)) // Use scale to size markers
            .attr('fill', 'steelblue')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on("mouseover", function(event, d) {  
                tooltip.style("visibility", "visible")
                       .html(`<strong>${d.totalTraffic} trips</strong> <br> (${d.departures} departures, ${d.arrivals} arrivals)`);
            })            
            .on("mousemove", function(event) {  // Move tooltip with mouse
                tooltip.style("top", (event.pageY + 10) + "px")
                       .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {  // Hide tooltip when not hovering
                tooltip.style("visibility", "hidden");
            });

        // Function to update circle positions dynamically
        function updatePositions() {
            circles
                .attr('cx', d => getCoords(d).cx)
                .attr('cy', d => getCoords(d).cy)
                .attr('r', d => radiusScale(d.totalTraffic)); // Apply radius scaling dynamically
        }

        // Initial position update
        updatePositions();

        // Update positions when map moves/zooms
        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);
    }).catch(error => {
        console.error('Error loading traffic data:', error);
    });

}).catch(error => {
    console.error('Error loading JSON:', error);
});

// Draws the map
map.on('load', () => {
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: bikeLaneStyle
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: bikeLaneStyle
    });
});

// Function to convert minutes to HH:MM AM/PM format
function formatTime(minutes) {
    if (minutes === -1) return "11:59 PM"; // Default display
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${mins.toString().padStart(2, "0")} ${period}`;
}

// Helper function: Convert minutes to HH:MM AM/PM format
function formatTime(minutes) {
    if (minutes === -1) return "11:59 PM"; // Default display
    const date = new Date(0, 0, 0, 0, minutes); // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

// Step 5.2: Function to update the time filter and display
function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value); // Update timeFilter from slider

    if (timeFilter === -1) {
        selectedTime.textContent = ''; // Clear displayed time
        anyTimeLabel.style.display = 'block'; // Show "(any time)"
    } else {
        selectedTime.textContent = formatTime(timeFilter); // Show formatted time
        anyTimeLabel.style.display = 'none'; // Hide "(any time)"
    }

    // Future: This will trigger filtering logic (implemented in the next step)
}

// Attach event listener to the slider
timeSlider.addEventListener('input', updateTimeDisplay);

// Set the initial display state
updateTimeDisplay();