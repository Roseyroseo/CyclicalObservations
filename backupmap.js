// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9zZXlyb3NlbyIsImEiOiJjbTdlMjN1NnowOWoyMnFwdXBkZmRib3h1In0.PcCswgFmZi5pYmeOrMO-ow';

// Step 5.2: Create a variable to hold the time filter value
let timeFilter = -1;

// Select slider and display elements
const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

let trips = [];
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
    if (!station || isNaN(station.lon) || isNaN(station.lat)) {
        console.warn("🚨 Invalid station coordinates:", station);
        return { cx: 100, cy: 100 }; // Assign a visible fallback position
    }
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);

    //console.log(`Station: ${station.short_name}, X: ${x}, Y: ${y}`); // Debugging

    return { cx: x, cy: y };
}

// Function to update circle positions dynamically
function updatePositions() {
    //console.log("Updating positions of circles");

    const circles = svg.selectAll('circle')
        .data(filteredStations, d => d.short_name);

    circles.attr('cx', d => getCoords(d).cx)
           .attr('cy', d => getCoords(d).cy);
}

// Attach to Mapbox move/zoom events globally
map.on('move', updatePositions);
map.on('zoom', updatePositions);
map.on('resize', updatePositions);
map.on('moveend', updatePositions);

// minutes since midnight
function minutesSinceMidnight(date) {
    if (!date) return null; // Prevent errors
    return date.getHours() * 60 + date.getMinutes();
}


// update map vis function
function updateMapVisualization() {
    if (!filteredStations.length) {
        console.warn("⚠️ No filtered stations found, forcing circle rendering!");
        filteredStations = stations.slice(0, 20); // Display at least some stations for debugging
    }
    

    //console.log("Rendering Circles for Stations:", filteredStations.length);

    const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(filteredStations, d => d.totalTraffic) || 1]) // Avoid NaN
    .range(timeFilter === -1 ? [0, 25] : [5, Math.min(50, 150 * (d3.max(filteredStations, d => d.totalTraffic) / d3.max(stations, d => d.totalTraffic)))]);


    const circles = svg.selectAll('circle')
        .data(filteredStations, d => d.short_name);

    // Remove old circles
    circles.exit().remove();

    // Enter + Merge new circles
    const mergedCircles = circles.enter()
        .append('circle')
        .merge(circles)
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);

    //console.log("Circles updated:", mergedCircles.size());

    // Update positions immediately after rendering
    updatePositions();

    // Apply event listeners AFTER elements exist
    mergedCircles.on("mouseover", function(event, d) {  
        if (!d) return; // Prevent event errors
        tooltip.style("visibility", "visible")
               .html(`<strong>${d.totalTraffic} trips</strong> <br> (${d.departures} departures, ${d.arrivals} arrivals)`);
    })
    .on("mousemove", function(event) {  
        tooltip.style("top", (event.pageY + 10) + "px")
               .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function() {  
        tooltip.style("visibility", "hidden");
    });
}


// filter trips by time
function filterTripsByTime() {
    if (!trips.length) return; // Ensure data is loaded

    //console.log("Current Time Filter:", timeFilter);

    filteredTrips = timeFilter === -1
        ? trips
        : trips.filter(trip => {
            if (!trip.started_at || !trip.ended_at) return false; // Skip trips with missing timestamps

            const startedMinutes = minutesSinceMidnight(trip.started_at);
            const endedMinutes = minutesSinceMidnight(trip.ended_at);

            return (
                (startedMinutes !== null && Math.abs(startedMinutes - timeFilter) <= 60) ||
                (endedMinutes !== null && Math.abs(endedMinutes - timeFilter) <= 60)
            );
        });

    //console.log("Filtered Trips:", filteredTrips.length);

    // Compute filtered arrivals & departures
    filteredArrivals = new Map();
    filteredDepartures = new Map();

    for (let trip of filteredTrips) {
        if (trip.end_station_id) {
            filteredArrivals.set(trip.end_station_id, (filteredArrivals.get(trip.end_station_id) || 0) + 1);
        }
        if (trip.start_station_id) {
            filteredDepartures.set(trip.start_station_id, (filteredDepartures.get(trip.start_station_id) || 0) + 1);
        }
    }

    // Update station data
    filteredStations = stations.map(station => {
        let id = station.short_name;
        let arrivals = filteredArrivals.get(id) ?? 0;
        let departures = filteredDepartures.get(id) ?? 0;
        let totalTraffic = arrivals + departures;

        return {
            ...station,
            arrivals: arrivals,
            departures: departures,
            totalTraffic: totalTraffic
        };
    });

    //console.log("Updated Filtered Stations:", filteredStations.length, filteredStations);
    //console.log("Final Filtered Stations Count:", filteredStations.length);
    
    if (filteredStations.length === 0) {
        console.warn("⚠️ No stations are being displayed! Check if the filtering logic is working.");
    }

    updateMapVisualization();
}


// Select the SVG inside #map
let svg = d3.select('#map').select('svg');
if (svg.empty()) {
    svg = d3.select("#map").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .style("position", "absolute")
        .style("top", "0")
        .style("left", "0");
}

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
    
        // Convert time strings to Date objects
        trips = trafficData.map(trip => {
            let startTime = new Date(trip.started_at);
            let endTime = new Date(trip.ended_at);
        
            //console.log(`🔍 Parsed Trip - Start: ${trip.started_at} -> ${startTime}, End: ${trip.ended_at} -> ${endTime}`);
        
            return {
                ...trip,
                started_at: startTime,
                ended_at: endTime
            };
        });
        
    
        //console.log("Converted Trip Data:", trips);
        //console.log("Trips Loaded:", trips.length);

        // APPLY INITIAL FILTER AFTER LOADING DATA
        filterTripsByTime();

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

        //console.log('Updated Stations with Traffic Data:', stations);

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
            const circles = svg.selectAll('circle')
                .data(filteredStations, d => d.short_name); // Ensure correct data binding
        
            circles.attr('cx', d => getCoords(d).cx)
                   .attr('cy', d => getCoords(d).cy);
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
    timeFilter = Number(timeSlider.value); // Get the selected time

    //console.log("Time Filter Updated:", timeFilter);

    selectedTime.textContent = timeFilter === -1 ? '' : formatTime(timeFilter);
    anyTimeLabel.style.display = timeFilter === -1 ? 'block' : 'none';

    filterTripsByTime(); // <---- Call filtering immediately
}

// Attach event listener to the slider
timeSlider.addEventListener('input', updateTimeDisplay);

// Set the initial display state
updateTimeDisplay();