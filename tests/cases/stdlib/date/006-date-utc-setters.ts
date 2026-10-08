// xl:title Date 的 UTC 写入口与时间戳往返
// xl:judge stdout
// xl:end

const d = new Date(0);
d.setUTCFullYear(2000);
d.setUTCMonth(5, 15);
d.setUTCHours(1, 2, 3, 4);
console.log(d.toISOString(), d.getTime());
const e = new Date(d.getTime());
console.log(e.toISOString() === d.toISOString(), e.getTime() - d.getTime());
