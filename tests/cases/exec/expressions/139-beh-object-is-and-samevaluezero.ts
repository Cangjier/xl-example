// xl:title Object.is 与 === 在 -0 / NaN 上的分岔
// xl:round 678
// xl:judge stdout
// xl:end

console.log(Object.is(NaN, NaN), NaN === NaN);
console.log(Object.is(0, -0), 0 === -0);
console.log(1 / 0, 1 / -0);
const s = new Set([NaN, NaN, 0, -0]);
console.log(s.size);
console.log([NaN].includes(NaN), [0].indexOf(-0));
