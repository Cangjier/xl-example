// xl:title `Date` 与数值格式化的几处日常写法
// xl:round 331
// xl:judge stdout
// xl:end

const d = new Date(0);
console.log(d.toISOString(), d.getTime(), Date.UTC(1970, 0, 1));
console.log((1234.5678).toFixed(2), (0.5).toFixed(0), (255).toString(16));
console.log(Number((1.005).toFixed(2)), (1000000).toString());
