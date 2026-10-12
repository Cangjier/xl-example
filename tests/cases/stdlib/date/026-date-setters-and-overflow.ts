// xl:title setUTC* 的溢出进位与 Date.UTC 的月份口径
// xl:round 371
// xl:judge stdout
// xl:end
const d = new Date(Date.UTC(2021, 0, 31));
d.setUTCMonth(1);
console.log(d.toISOString());
d.setUTCDate(d.getUTCDate() + 1);
console.log(d.toISOString());
console.log(new Date(Date.UTC(2021, 12, 1)).toISOString());
console.log(new Date(Date.UTC(2021, 0, 0)).toISOString());
