// xl:title Date 的本地时间构造：本地字段 → 时间戳 → UTC 取值
// xl:judge stdout
// xl:want differ
// xl:why 多分量 `new Date(y, m, d, …)` 按 UTC 记时间戳：getTime 差一个时区偏移、toISOString 把本地时间当 UTC
// xl:end

const local = new Date(2020, 0, 2, 3, 4, 5);
console.log(Number.isInteger(local.getTime()));
console.log(local.getTime() === new Date("2020-01-02T03:04:05Z").getTime());
console.log(local.getHours(), local.getUTCHours(), local.toISOString().slice(11, 19));
