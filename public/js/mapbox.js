// For tour data in our tour.pug we append the tour data to our htm(Basically expose it to the html)
// From there our mapbox.js picks up the tour data
try {
  const locations = JSON.parse(
    document.getElementById('map').dataset.locations
  );

  mapboxgl.accessToken =
    'pk.eyJ1IjoiaXRzLW1lMTgiLCJhIjoiY2x3OWw5NHg4MDFuMDJpcGE3YXhldmEzbyJ9.54mhLHVOImvUmaCsMEpoJQ';

  const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/its-me18/clw9n15bz005z01qrhgz22t9k', // style URL
    scrollZoom: false,
    // center: [-122.4167, 37.7833], // starting position [lng, lat]
    // zoom: 8, // starting zoom
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create Marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker to map
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add a popup to show the location
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
} catch (error) {
  console.error('Error initializing map:', error);
}
