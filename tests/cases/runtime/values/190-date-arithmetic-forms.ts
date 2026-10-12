// xl:title 日期的创建、算术与比较
// xl:round 371
// xl:judge stdout
// xl:end
const a = new Date(Date.UTC(2020, 0, 1));
const b = new Date(Date.UTC(2020, 11, 31));
console.log(b.getTime() - a.getTime(), a < b, a.getTime() === a.getTime());
console.log(new Date(a.getTime() + 86400000).toISOString().slice(0, 10));
const times = [a, b].sort((x, y) => x.getTime() - y.getTime());
console.log(times.map((d) => d.toISOString().slice(0, 4)).join(","));
console.log(Number(a) === a.getTime(), a.toISOString().length, JSON.stringify(a).slice(1, 5));
