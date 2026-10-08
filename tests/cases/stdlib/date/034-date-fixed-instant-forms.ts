// xl:title Date：固定时刻的 ISO / UTC 串 / toJSON / getTime
// xl:judge stdout
// xl:end

const d = new Date(0);
console.log(d.getTime(), d.toISOString(), d.toJSON(), d.valueOf());
console.log(new Date(1700000000000).toISOString(), new Date("2020-01-02T03:04:05.678Z").getTime());
console.log(Date.parse("2020-01-02T03:04:05.678Z"), Date.parse("not a date"), Number.isNaN(Date.parse("x")));
