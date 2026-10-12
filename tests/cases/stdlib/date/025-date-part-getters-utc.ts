// xl:title Date 的 getUTC* 一族与 toISOString 的往返
// xl:round 371
// xl:judge stdout
// xl:end
const d = new Date(Date.UTC(2021, 5, 7, 8, 9, 10, 11));
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
console.log(d.getUTCDay(), d.toISOString());
console.log(new Date(d.toISOString()).getTime() === d.getTime());
