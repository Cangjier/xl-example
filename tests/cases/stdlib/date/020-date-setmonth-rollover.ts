// xl:title `setMonth` 溢出会进位
// xl:round 305
// xl:judge stdout
// xl:end

const d = new Date(0);
d.setUTCMonth(13);
console.log(d.getUTCFullYear(), d.getUTCMonth());
