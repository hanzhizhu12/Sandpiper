import { findNearestStation, loadStations } from "./stations.js";

let beachCache = {};

async function loadBeaches(county, stations) {
    if (beachCache[county]) {
        return  beachCache[county];
    } else {
        const rawFeatures = await getBeaches(county);
        const validFeatures = filterValidBeaches(rawFeatures);
        beachCache[county] = validFeatures.map((feature) => convertBeaches(feature, stations));  
        return beachCache[county];
    }
}
async function loadBeachesForCounties(countyList) {
    const stations = await loadStations();
    const promises = countyList.map(county => loadBeaches(county, stations));
    const results = await Promise.all(promises);
    return results.flat();
}

async function getBeaches(county) {
    const url = `https://gis.ecology.wa.gov/serverext/rest/services/GIS/CoastalAtlas/MapServer/9/query?` +
        `where=County_NM='${county}'&outFields=Beach_Name,Latitude,Longitude,Shellfishing,Crabbing,Boat_Launch&f=json`;

    const response = await fetch(url);
    const data = await response.json();
    return data.features;
}
function getBoatAccess(rawValue) {
    if (rawValue === null || rawValue === "None") {
        return "None";
    }
    return rawValue;
}

function filterValidBeaches(features) {
    return features.filter((feature) => {
        return feature.attributes.Latitude !== null && feature.attributes.Longitude !== null;
    });
}

function convertBeaches(feature, stations) {
    const attrs = feature.attributes;

    const species = [];
    if (attrs.Shellfishing === "Yes") {
        species.push("clams");
    }
    if (attrs.Crabbing === "Yes") {
        species.push("crabs");
    }

    const location = { lat: parseFloat(attrs.Latitude), lng: parseFloat(attrs.Longitude) };
    const nearest = findNearestStation(location, stations);

    return {
        name: attrs.Beach_Name,
        lat: parseFloat(attrs.Latitude),
        lng: parseFloat(attrs.Longitude),
        nearestStationId: nearest.id,
        species: species,
        boatAccess: getBoatAccess(attrs.Boat_Launch),
    };
}

function findBeachesNearStation(stationId, beaches) {
    const nearestBeach = beaches.filter(beach => beach.nearestStationId === stationId);
    return nearestBeach;
}

export { loadBeachesForCounties, findBeachesNearStation };