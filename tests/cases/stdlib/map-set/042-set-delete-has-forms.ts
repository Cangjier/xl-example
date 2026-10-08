// xl:title Set 的增删与 NaN / ±0
// xl:round 304
// xl:judge stdout
// xl:end

const s = new Set<any>([1, 2, NaN, 0, -0]);
console.log(s.size, s.has(NaN), s.has(0), s.has(-0));
console.log(s.delete(2), s.size, [...s].length);
