// xl:title NaN 当键
// xl:round 692
// xl:judge stdout
// xl:end

const m = new Map();
m.set(NaN, 1);
console.log(m.get(NaN), m.has(NaN));
