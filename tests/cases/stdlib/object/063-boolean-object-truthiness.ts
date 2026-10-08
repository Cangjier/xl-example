// xl:title `new Boolean(false)` 是真值
// xl:round 305
// xl:judge stdout
// xl:end

const b = new Boolean(false);
console.log(typeof b, Boolean(b), b.valueOf(), String(b));
