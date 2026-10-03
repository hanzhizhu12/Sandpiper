import { getTodaysDate } from "./date.js";
import { loadStations, findNearestStation } from "./stations.js";

  async function getTidePredictions(stationId) {
    const today = getTodaysDate();
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
      `station=${stationId}&product=predictions&datum=MLLW&` +
      `time_zone=lst_ldt&units=english&format=json&interval=hilo&begin_date=${today}&range=168`;  
    const response = await fetch(url);
    const data = await response.json();
    return data.predictions;
}
    async function getAllTidePredictions() {
        const results = stations.map((station) =>{
            return getTidePredictions(station.id)
            .then(predictions => ({ station: station.name, predictions }))
            .catch(err => ({ station: station.name, error: err.message }));
        })
    
    return Promise.all(results);

}



export { getTidePredictions, getAllTidePredictions };

  // Station IDS
  // Bremerton, WA [9445958], Westport, WA [9441102], Port Angeles, WA [9444090]

