// xl:title `Date` 的构造 / UTC 取值 / `setUTC*` / `Date.UTC` 的形状
// xl:round 746
// xl:judge stdout
// xl:end
const d = new Date(0);
console.log(d.getTime(), d.valueOf(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
console.log(d.getUTCDay(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
console.log(d.toISOString(), d.toJSON(), d.toUTCString());
try { new Date(NaN).toISOString(); } catch (e) { console.log((e as Error).constructor.name); }
console.log(new Date("1970-01-01T00:00:00.000Z").getTime(), new Date(0).getTime());
const s = new Date(0);
s.setUTCFullYear(2000);
console.log(s.getTime(), s.toISOString());
s.setUTCMonth(13);
console.log(s.toISOString());
const t = new Date(0);
t.setUTCDate(32);
console.log(t.toISOString());
const u = new Date(0);
u.setUTCHours(25);
console.log(u.toISOString());
console.log(Date.UTC(2020, 0, 2, 3, 4, 5, 6));
console.log(Date.parse("1970-01-01T00:00:00.000Z"), Date.parse("2020-01-02"));
console.log(Number.isNaN(Date.parse("not a date")), typeof Date.now(), Date.now() > 0);
