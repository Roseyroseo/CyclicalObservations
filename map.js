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