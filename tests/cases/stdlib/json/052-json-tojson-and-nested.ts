// xl:title JSON.stringify 认 toJSON、循环引用抛错
// xl:round 8
// xl:judge stdout
// xl:end

const v = { a: 1, when: { toJSON() { return "T"; } }, list: [1, [2, 3]] };
console.log(JSON.stringify(v));
console.log(JSON.stringify({ x: undefined, y: () => 1, z: null }));
const cycle = {};
cycle.self = cycle;
try { JSON.stringify(cycle); } catch (e) { console.log(e.constructor.name); }
