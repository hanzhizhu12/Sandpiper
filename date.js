import tzlookup from "tz-lookup";

function getDateParts(daysFromToday = 0) {
    const now = new Date();
    now.setDate(now.getDate() + daysFromToday);
    
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().padStart(4, '0');
    
    return { day, month, year };
}

function getTodaysDate(daysFromToday = 0) {
    const { day, month, year } = getDateParts(daysFromToday);
    return `${year}${month}${day}`;
}

function getTodaysDateWithDash(daysFromToday = 0) {
    const { day, month, year } = getDateParts(daysFromToday);
    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatDate(date) {
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function getStationTimeZone(lat, lng) {
    return tzlookup(lat, lng)
}


// takes station prediction time and converts it into device local time based on the stations coordinates and the device's own loacl time
function parseStationDate(dateString, timeZone) {
    const [datePart, timePart] = dateString.split(" ");

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    // Start by pretending the station time is UTC.
    let timestamp = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute
    );

    for (let i = 0; i < 2; i++) {
        const date = new Date(timestamp);

        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).formatToParts(date);

        const values = {};

        for (const part of parts) {
            if (part.type !== "literal") {
                values[part.type] = Number(part.value);
            }
        }

        const localTimestamp = Date.UTC(
            values.year,
            values.month - 1,
            values.day,
            values.hour,
            values.minute
        );

        const targetTimestamp = Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute
        );

        timestamp += targetTimestamp - localTimestamp;
    }

    return new Date(timestamp);
}

export { getTodaysDate, getTodaysDateWithDash, formatTime, formatDate, getStationTimeZone, parseStationDate };