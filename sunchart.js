import { getTodaysDateWithDash } from "./date.js";

const suncharts = [
    { id: "9445958", name: "Bremerton, WA", lat: 47.5617, lng: -122.6506},
    { id: "9441102", name: "Westport, WA", lat: 46.9040, lng: -124.1054},
    { id: "9444090", name: "Port Angeles, WA", lat: 48.1257, lng: -123.4406},
]

const startDate = 0
const endDate = 7
const dateStart = getTodaysDateWithDash(startDate);
const dateEnd = getTodaysDateWithDash(endDate);


// need to fix when .find() returns undefined when prediction is outside 7 day range
function findSunDataForDate(predictionDateString, sunDays) {
    /*
    console.log("DEBUG predictionDateString:", predictionDateString);

    if (!predictionDateString) {
        console.log("ERROR: predictionDateString is undefined");
        return undefined;
    }
    */

    
    
    const predictionDate = predictionDateString.split(' ')[0];
    const sunDate = sunDays.find(sunDay => sunDay.date === predictionDate);
    return sunDate
}

async function getSunriseSunsetPredictions(station, dateStart, dateEnd) {
    const url = `https://api.sunrise-sunset.org/v2?lat=${station.lat}&lng=${station.lng}&date_start=${dateStart}&date_end=${dateEnd}`;

    const response = await fetch(url);
    const data = await response.json();
    return data.days;
}

async function getAllSunPredictions() {
    const results = suncharts.map((station) =>{
        return getSunriseSunsetPredictions(station, dateStart, dateEnd)
        .then(predictions => ({ station: station.name, predictions }))
        .catch(err => ({ station: station.name, error: err.message }));
    })

    return Promise.all(results);
}

export { getSunriseSunsetPredictions, getAllSunPredictions, findSunDataForDate};