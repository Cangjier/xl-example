// xl:title UTC 的读写一组
// xl:round 291
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 5, 15, 10, 30, 45));
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
d.setUTCFullYear(2021);
d.setUTCMonth(0);
d.setUTCDate(2);
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
