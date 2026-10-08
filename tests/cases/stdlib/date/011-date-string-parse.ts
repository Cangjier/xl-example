// xl:title Date.parse 与 new Date(字符串)
// xl:judge stdout
// xl:end

const ms = Date.parse("1970-01-01T00:00:00.000Z");
console.log(ms, new Date(ms).toISOString(), new Date("1970-01-01T00:00:00.000Z").getTime());
