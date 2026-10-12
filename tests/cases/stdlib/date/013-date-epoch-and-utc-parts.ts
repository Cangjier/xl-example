// xl:title Date 的纪元与 UTC 取值
// xl:round 291
// xl:judge stdout
// xl:end

const d = new Date(0);
console.log(d.getTime(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
console.log(Date.UTC(1970, 0, 2), new Date(Date.UTC(2000, 0, 1)).getUTCFullYear());
