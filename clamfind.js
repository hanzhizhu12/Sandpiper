
import { getSunriseSunsetPredictions } from "./sunchart.js";
import { getTidePredictions } from "./tidechart.js";
import { getTodaysDateWithDash, formatTime, formatDate, getStationTimeZone, parseStationDate } from "./date.js";
import { findSunDataForDate } from "./sunchart.js";
import { loadBeachesForCounties, findBeachesNearStation } from "./beaches.js";
import { loadStations, findNearestStation, getDistanceKm } from "./stations.js";
import { geocodeAddress, reverseGeocode } from "./geocode.js";

function scoreClammingWindow(prediction, sunrise, sunset, station) {
    if (prediction.type !== "L") {
        return "Skip";
    }

    const height    = parseFloat(prediction.v);
    const timeZone = getStationTimeZone(station.lat, station.lng);
    const predictiontime = parseStationDate(prediction.t, timeZone);
    const sunrisetime = new Date(sunrise);
    const sunsettime = new Date(sunset);

    if (predictiontime > sunrisetime && predictiontime < sunsettime) {
        if (height < -1) {
            return "Excellent";
        } else if (height > -1 && height < +1) {
            return "Good";
        } else {
            return "Poor";
        }
    } else {
        return "Poor"
    }
}  

function findNearestBeach(userLocation, beaches) {
    let nearestBeach = null;
    let minDistance = Infinity;

    for (const beach of beaches) {
        const distance = getDistanceKm(userLocation.lat, userLocation.lng, beach.lat, beach.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearestBeach = beach;
        }
    }

    return nearestBeach;
}

function findBestWindow(windows) {
    const rank = { "Excellent": 3, "Good": 2, "Fair": 1, "Poor": 0 };
    return windows.reduce((best, current) => {
        return rank[current.label] > rank[best.label] ? current : best;
    });
}

async function getClammingRecommendation(address)    {
    const userLocation = await geocodeAddress(address);
    if (!userLocation) {
        return {
            recommendation: null,
            message: "No location found for that address."
        };
    }
    

    const stations = await loadStations();
    const nearest = findNearestStation(userLocation, stations);

    if (!nearest) {
        return {
            recommendation: null,
            message: "No nearby tide station found"
        }
    }

    const county = await reverseGeocode(nearest.lat, nearest.lng);
    
    const nearestTidePredictions = await getTidePredictions(nearest.id);
    if (!nearestTidePredictions) {
        return {
            recommendation: null,
            message: "No data found for given address / invalid address"
        };
    }

    const beaches = await loadBeachesForCounties([county]);
    const nearbyBeaches = findBeachesNearStation(nearest.id, beaches);
    const clammingBeaches = nearbyBeaches.filter((beach) => beach.species.includes("clams"));

    const dateStart = getTodaysDateWithDash();
    const dateEnd = getTodaysDateWithDash(7);

    const sunDays = await getSunriseSunsetPredictions(nearest, dateStart, dateEnd);


   /*
    console.log("Nearest Station:", nearest.name);
    console.log("tide predictions:", nearestTidePredictions);
    console.log("sun data:", sunDays);
    */

    const allScored = nearestTidePredictions.filter((prediction) => prediction.type === "L").map((prediction) => {
        const sunData = findSunDataForDate(prediction.t, sunDays);
        if (!sunData) return null;
        const score = scoreClammingWindow(prediction, sunData.sunrise, sunData.sunset, nearest);
        return { station: nearest.name, label: score, ...prediction };
    }).filter((prediction) => prediction !== null);

    if (allScored.length === 0) {
        return { recommendation: null, message: "No Good Windows Found" };
    }

    const bestWindow = findBestWindow(allScored);
    const nearestBeach = findNearestBeach(userLocation, clammingBeaches)
    // const predictionDateTime = new Date(bestWindow.t);

    const timeZone = getStationTimeZone(nearest.lat, nearest.lng);
    const predictionDateTime = parseStationDate(bestWindow.t, timeZone)

    const alternateTimes = 
        allScored.filter((prediction) => prediction.t !== bestWindow.t)
        .map((prediction) => ({
            ...prediction,
            dateTime: parseStationDate(prediction.t, timeZone)
        }))
        .sort((a, b) => a.dateTime - b.dateTime)
        .slice(0 , 3);

    if (!nearestBeach) {
        return { recommendation: null, message: "No Nearby Beaches" };
    }
    return { recommendation: {beach: nearestBeach.name, date: formatDate(predictionDateTime), when: formatTime(predictionDateTime), label: bestWindow.label, alternateTimes: alternateTimes, lat: nearestBeach.lat, lng: nearestBeach.lng } /* , windows: allScored, beaches: clammingBeaches */ }
}

/*
getClammingRecommendation("Bremerton, WA")
    .then(results => console.log(JSON.stringify(results, null, 2)))
    .catch(err => console.error("Error:", err));
*/

export { getClammingRecommendation };