let stationCache = null;

async function loadStations() {
    if (stationCache !== null) {
        return stationCache;
    }

    const url = `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels`;
    const response = await fetch(url);
    const data = await response.json();

    stationCache = data.stations;
    return stationCache;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLng/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function findNearestStation(userLocation, stations) {
    let nearestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
        const distance = getDistanceKm(userLocation.lat, userLocation.lng, station.lat, station.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearestStation = station;
        }
    }

    return nearestStation;
}

export { loadStations, findNearestStation, getDistanceKm };