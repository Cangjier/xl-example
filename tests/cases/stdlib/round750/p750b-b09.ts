// xl:title `Date` 的形式与 `toISOString` / `getTime` 的边界
// xl:round 750
// xl:judge stdout
// xl:end
const d = new Date(0);
console.log(d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.toISOString());
console.log(new Date("2020-01-02T03:04:05.000Z").getTime());
console.log(new Date(2020, 0, 1).getFullYear(), Date.UTC(2020, 0, 1));
console.log(typeof Date.now(), Number.isFinite(Date.now()));
console.log(new Date(NaN).getTime(), String(new Date(NaN)));
console.log(new Date(0).toJSON(), JSON.stringify({ d: new Date(0) }));
