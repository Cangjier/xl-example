// xl:title -0 与 0 同一个键
// xl:round 692
// xl:judge stdout
// xl:end

const m = new Map();
m.set(-0, 1);
console.log(m.get(0), m.has(-0));
