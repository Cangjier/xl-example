// xl:title Date.parse 的合法与非法形状
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Date.parse("1970-01-01T00:00:00.000Z"), Date.parse("2020-05-15T10:20:30Z"));
console.log(Number.isNaN(Date.parse("not a date")), Number.isNaN(new Date("nope").getTime()));
console.log(new Date(0).toISOString(), String(new Date(NaN)));
