import { getSunriseSunsetPredictions } from "./sunchart.js";
import { getTidePredictions } from "./tidechart.js";
import { getTodaysDateWithDash, formatTime, formatDate, getStationTimeZone, parseStationDate } from "./date.js";
import { findSunDataForDate } from "./sunchart.js";
import { loadBeachesForCounties, findBeachesNearStation } from "./beaches.js";
import { loadStations, findNearestStation, getDistanceKm } from "./stations.js";
import { geocodeAddress, reverseGeocode } from "./geocode.js";

function groupPredictionsByDate(predictions) {
     const combinedPredictions = predictions.reduce((acc, prediction) => {
        const date = prediction.t.split(' ')[0];
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(prediction);
        return acc;
     }, {});
    return combinedPredictions; 
    }

function calculateSlackWindow(tidePrediction, station) {
    const timeZone = getStationTimeZone(station.lat, station.lng);
    const tideTime = parseStationDate(tidePrediction.t, timeZone);

    const windowStart = new Date(tideTime.getTime() - 60 * 60 * 1000)
    const windowEnd = new Date(tideTime.getTime() + 60 * 60 * 1000)

    /*
^ const windowStart = new Date(tideTime); etc...

    windowStart.setHours(windowStart.getHours() - 60 * 60 * 1000);
    windowEnd.setHours(windowEnd.getHours() + +60 * 60 * 1000);
    */


    return {
        start: windowStart,
        end: windowEnd,
        tideType: tidePrediction.type
    };
}

function isSlackWindowUsable(slackWindow, sunrise, sunset, now) {
    const sunrisetime = new Date(sunrise);
    const sunsettime = new Date(sunset);

    return (slackWindow.end > now && slackWindow.start < sunsettime && slackWindow.end > sunrisetime);
}

function scoreCrabbingDay(dayPredictions, sunrise, sunset, validSlackWindows, station) {
    
    const sunrisetime = new Date(sunrise);
    const sunsettime = new Date(sunset);
    
    const lows = dayPredictions.filter((p) => p.type === "L");
    const highs = dayPredictions.filter((p) => p.type === "H");

    const usableTides = dayPredictions.filter((tide) => {
        const slackWindow = calculateSlackWindow(tide, station);
            return isSlackWindowUsable(
                slackWindow,
                sunrise,
                sunset,
                new Date()
            );
        });

    if (usableTides.length === 0) {
        return {
            label: "Poor",
            note: "No usable slack tide window remains",
            tide: "No tide window found"
        };
    }

    if (lows.length === 0 || highs.length === 0) {
        return {label: "Poor", note: "No usable low and high tide combination found", tide: "No usable tide combination found"};
    }

    const lowestLowPrediction = lows.reduce((best, p) =>
        parseFloat(p.v) < parseFloat(best.v) ? p : best
    );
    const highestHighPrediction = highs.reduce((best, p) => parseFloat(p.v) > parseFloat(best.v) ? p : best);

    const recommendedTide = usableTides.find((tide) => {
        const tideTime = parseStationDate(
            tide.t,
            getStationTimeZone(station.lat, station.lng)
        );
    
        return tideTime > sunrisetime && tideTime < sunsettime;
    });

    if (!recommendedTide) {
        return {
            label: "Fair",
            note: "Usable slack window exists, but no tide occurs during daylight"
        };
    }

    const lowestLow = parseFloat(lowestLowPrediction.v);
    const highestHigh = parseFloat(highestHighPrediction.v); /* ...highs.map((p) => parseFloat(p.v)) */

    
    const timeZone = getStationTimeZone(station.lat, station.lng);
    
    const lowTime = parseStationDate(lowestLowPrediction.t, timeZone)
    const lowInDaylight = lowTime > sunrisetime && lowTime < sunsettime;

    if (lowestLow < 1 && highestHigh > 4 && lowInDaylight) {
        return { label: "Good", note: "Low tide under 1ft during daylight, high tide over 4ft", tide: recommendedTide};
    } else if (lowestLow < 1 && highestHigh > 4) {
        return { label: "Fair", note: "Good tide heights, but low tide isn't during daylight", tide: recommendedTide};
    } else {
        return { label: "Poor", note: "Tide heights outside ideal range for trapping", tide: "Tide heights outside trapping range" };
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

function rankWindows(windows) {
    const rank = { "Excellent": 3, "Good": 2, "Fair": 1, "Poor": 0 };
    return [...windows].sort((a, b) => rank[b.label] - rank[a.label]);
}

async function getCrabbingRecommendation(address) {
    const userLocation = await geocodeAddress(address);
    if (!userLocation) {
        return {
            recommendation: null,
            message: "No location found for that address."
        };
    }

    const stations = await loadStations();
    const nearest = findNearestStation(userLocation, stations);
    
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
    const crabbingBeaches = nearbyBeaches.filter((beach) => beach.species.includes("crabs"));
    
    const dateStart = getTodaysDateWithDash();
    const dateEnd = getTodaysDateWithDash(7);

    const sunDays = await getSunriseSunsetPredictions(nearest, dateStart, dateEnd);

    const groupedPredictions = groupPredictionsByDate(nearestTidePredictions);

    const allDays = Object.keys(groupedPredictions).map((date) => {
        const sunData = findSunDataForDate(date, sunDays);

        const dayTides = groupedPredictions[date].filter(
            (prediction) => prediction.type === "L" || prediction.type === "H"
        );
        if (!sunData) return { recommendation: null, message: "No Sun Data Found" };;
        const slackWindows = dayTides.map((tide) => calculateSlackWindow(tide, nearest));

        const validSlackWindows = slackWindows.filter((window) => 
            isSlackWindowUsable(window, sunData.sunrise, sunData.sunset, new Date())
        );

        const score = scoreCrabbingDay(groupedPredictions[date], sunData.sunrise, sunData.sunset, validSlackWindows, nearest);
        return { station: nearest.name, date, ...score, slackWindows: validSlackWindows, predictions: groupedPredictions[date] };
    }).filter((day) => day !== null && day.date >= getTodaysDateWithDash());



    if (allDays.length === 0) {
        return { recommendation: null, message: "No Good Windows Found" };
    } else {
        const bestWindow = findBestWindow(allDays);
        const slackWindow = calculateSlackWindow(bestWindow.tide, nearest);
        
        const alternateWindows = 
        allDays.flatMap((day) => day.slackWindows)
        .filter((window) => window.start.getTime() !== slackWindow.start.getTime())
        .sort((a,b) => a.start - b.start)
        .slice(0,3);

        

        console.log("best window", bestWindow);
        console.log("alternate tides", bestWindow.alternateTides);


        const nearestBeach = findNearestBeach(userLocation, crabbingBeaches);

        console.log("BEST TIDE:", bestWindow.tide);
        console.log("SLACK START:", formatDate(slackWindow.start));
        console.log("SLACK END:", formatDate(slackWindow.end));

        const timeZone = getStationTimeZone(nearest.lat, nearest.lng)
        
        const predictionDateTime = parseStationDate(bestWindow.tide.t, timeZone);


        const predictionDate = formatDate(predictionDateTime);

        if (!nearestBeach) {
            return { recommendation: null, message: "No Good Windows Found" };
        }

        return { recommendation: { 
            beach : nearestBeach?.name, 
            date: predictionDate, 
            windowStart: formatTime(slackWindow.start), 
            windowEnd: formatTime(slackWindow.end) , 
            label: bestWindow.label, 
            alternateWindows: alternateWindows,
            lat: nearestBeach.lat, 
            lng: nearestBeach.lng } /* , windows: allDays, beaches: crabbingBeaches */}
    }
}

/*
getCrabbingRecommendation("Bremerton, WA")
    .then(results => console.log(JSON.stringify(results, null, 2)))
    .catch(err => console.error("Error:", err));
*/

export { getCrabbingRecommendation};