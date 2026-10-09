// xl:title 日期算术：差值、比较、克隆
// xl:round 371
// xl:judge stdout
// xl:end
const a = new Date(Date.UTC(2020, 0, 1));
const b = new Date(Date.UTC(2020, 0, 2));
console.log((b.getTime() - a.getTime()) / 3600000, b > a, a < b, a.getTime() === b.getTime());
console.log(new Date(a.getTime()).toISOString(), +a === a.getTime(), a - (0 as any) === a.getTime());
