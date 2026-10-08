// xl:title Date 的 toISOString / toJSON / 各处 UTC 取值
// xl:judge stdout
// xl:end

const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5));
console.log(d.toISOString(), d.toJSON(), JSON.stringify({ d }));
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
console.log(new Date(0).toISOString(), new Date("2021-03-04T05:06:07Z").getTime());
