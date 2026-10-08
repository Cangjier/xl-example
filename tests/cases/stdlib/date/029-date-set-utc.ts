// xl:title Date.setUTC* 三件：分 / 秒 / 毫秒（含进位）
// xl:round 623
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6));
d.setUTCMinutes(30);
d.setUTCSeconds(7);
d.setUTCMilliseconds(8);
console.log(d.toISOString());
const e = new Date(Date.UTC(2020, 0, 2, 3, 59, 59, 999));
e.setUTCMinutes(60);
e.setUTCSeconds(60);
e.setUTCMilliseconds(1000);
console.log(e.toISOString());
