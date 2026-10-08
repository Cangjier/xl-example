// xl:title Date：setUTC* 七个格子与往返一致
// xl:judge stdout
// xl:end

const d = new Date(0);
d.setUTCFullYear(2000);
d.setUTCMonth(5);
d.setUTCDate(15);
d.setUTCHours(12, 30, 45, 500);
console.log(d.toISOString());
console.log(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
console.log(new Date(d.getTime()).toISOString() === d.toISOString());
