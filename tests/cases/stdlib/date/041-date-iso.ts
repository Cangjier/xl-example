// xl:title Date.toISOString / toJSON / getTime 与 UTC 取值
// xl:round 676
// xl:judge stdout
// xl:want differ
// xl:why `new Date(2020, 0, 2, 3, 4, 5, 6)` 的本地分量没换算成 UTC：toISOString 把本地墙上时间打成了 UTC
// xl:end

const d = new Date(2020, 0, 2, 3, 4, 5, 6);
console.log(d.toISOString(), d.toJSON() === d.toISOString());
const epoch = new Date(0);
console.log(epoch.toISOString(), epoch.getUTCFullYear(), epoch.getUTCHours(), epoch.getTime());
