// xl:title 符号键不进 Object.keys
// xl:round 692
// xl:judge stdout
// xl:end

const s = Symbol("s");
const o = { [s]: 1, a: 2 };
console.log(Object.keys(o).join(","), o[s], Object.getOwnPropertySymbols(o).length);
