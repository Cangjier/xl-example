// xl:title Date.UTC / 两位年份 / 越界进位 / 本地时区字段
// xl:judge stdout
// xl:end

console.log(Date.UTC(1970, 0, 1), Date.UTC(99, 0, 1) === Date.UTC(1999, 0, 1), Date.UTC(2020, 12, 1));
const d = new Date(Date.UTC(2020, 0, 31, 25, 0, 0));
console.log(d.toISOString(), new Date(Date.UTC(2020, 1, 29)).toISOString());
console.log(new Date(0).getUTCFullYear(), new Date(0).getUTCMonth(), new Date(0).getUTCDay());
