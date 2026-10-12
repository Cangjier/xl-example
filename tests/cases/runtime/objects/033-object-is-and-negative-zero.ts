// xl:title Object.is / -0 / NaN 的分辨
// xl:round 7
// xl:judge stdout
// xl:end

console.log(Object.is(NaN, NaN), NaN === NaN);
console.log(Object.is(0, -0), 0 === -0);
console.log(1 / -0 === -Infinity, String(-0));
const box = { z: -0 };
console.log(Object.is(box.z, -0), box.z === 0);
