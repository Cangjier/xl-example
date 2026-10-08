// xl:title Math.atan2 的四个象限与零
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Math.atan2(1, 1).toFixed(6), Math.atan2(1, -1).toFixed(6));
console.log(Math.atan2(-1, -1).toFixed(6), Math.atan2(0, 0), Math.atan2(1, 0).toFixed(6));
