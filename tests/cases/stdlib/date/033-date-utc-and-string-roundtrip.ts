// xl:title Date 的 UTC getter / toISOString / 时间戳往返
// xl:round 653
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6));
console.log(d.getTime(), d.toISOString(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
console.log(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(), d.getUTCDay());
const back = new Date(d.toISOString());
console.log(back.getTime() === d.getTime(), Date.parse(d.toISOString()) === d.getTime());
