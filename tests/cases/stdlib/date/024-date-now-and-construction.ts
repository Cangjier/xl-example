// xl:title Date.now / new Date(ms) / new Date(string) 的读数
// xl:round 371
// xl:judge stdout
// xl:end
const t = new Date(0);
console.log(t.getTime(), t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
console.log(new Date("2020-01-02T03:04:05.000Z").getTime());
console.log(new Date(2020, 0, 2).getFullYear(), typeof Date.now(), Date.now() > 0);
console.log(new Date(NaN).getTime(), String(new Date(NaN)));
