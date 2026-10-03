async function geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    const response = await fetch(url, {
        headers: { "User-Agent": "ClamCrabFinderApp/1.0" }
    });
    const data = await response.json();

    if (data.length === 0) {
        return null;
    }

    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`;

    const response = await fetch(url, {
        headers: { "User-Agent": "ClamCrabFinderApp/1.0" }
    });
    const data = await response.json();

    return cleanCountyName(data.address.county);
}

function cleanCountyName(rawCounty) {
    if (!rawCounty) {
        return null;
    }
    return rawCounty.replace(" County", "");
}

export { geocodeAddress, reverseGeocode };