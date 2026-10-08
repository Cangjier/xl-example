// xl:title Date 的 setter：越界归一化（setUTCMonth / setUTCDate）与返回的时间戳
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 0, 1));
console.log(d.setUTCMonth(12), d.toISOString());
console.log(d.setUTCDate(0), d.toISOString());
