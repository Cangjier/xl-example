// xl:title `Date` 的算术、比较与 UTC 往返
// xl:round 330
// xl:judge stdout
// xl:end

const a = new Date(0);
const b = new Date(86400000);
console.log(b.getTime() - a.getTime(), b > a, a < b);
const iso = new Date(1700000000000).toISOString();
console.log(iso, Date.parse(iso));
console.log(Date.UTC(1970, 0, 2) / 86400000);
