// xl:title Date 的 UTC 分量（一个确定的时刻）
// xl:judge stdout
// xl:end

const d = new Date(0);
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
