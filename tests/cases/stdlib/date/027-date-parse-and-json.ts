// xl:title Date.parse 与 toJSON；无效日期的字符串形态
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Date.parse("1970-01-01T00:00:00.000Z"), Date.parse("2020-01-01"));
console.log(JSON.stringify(new Date(0)), JSON.stringify({ at: new Date(86400000) }));
console.log(JSON.stringify(new Date(NaN)));
console.log(new Date(0).toJSON() === new Date(0).toISOString());
