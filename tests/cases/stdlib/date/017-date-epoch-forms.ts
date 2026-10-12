// xl:title Date 的时间戳读法与 UTC 年月的往返
// xl:round 304
// xl:judge stdout
// xl:end

const d = new Date(0);
console.log(d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const d2 = new Date(Date.UTC(2020, 5, 15, 12, 30, 45, 123));
console.log(d2.getTime(), d2.toISOString());
console.log(new Date(1e12).getUTCFullYear());
