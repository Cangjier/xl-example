// xl:title `Date`：UTC 读写、格式化与比较
// xl:round 338
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6));
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
console.log(d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
console.log(d.toISOString());
console.log(d.getTime(), new Date(0).getTime(), new Date(1000).getTime());
const later = new Date(d.getTime() + 86400000);
console.log(later.getUTCDate(), later > d, d < later);
const parsed = new Date("2020-01-02T03:04:05.006Z");
console.log(parsed.getTime() === d.getTime());
console.log(typeof d.getTime(), d.getUTCDay() >= 0);
