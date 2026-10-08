// xl:title Date.parse 与 toISOString 的往返
// xl:round 291
// xl:judge stdout
// xl:end

const ms = Date.parse("1970-01-01T00:00:00.000Z");
console.log(ms, new Date(ms).toISOString());
console.log(new Date(86400000).toISOString());
