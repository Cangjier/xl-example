// xl:title Date：UTC 构造、getTime、toISOString、差值
// xl:round 9
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5));
console.log(d.toISOString(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
console.log(d.getTime() === Date.UTC(2020, 0, 2, 3, 4, 5));
const e = new Date(Date.UTC(2020, 0, 3));
console.log((e.getTime() - d.getTime()) / 3600000);
