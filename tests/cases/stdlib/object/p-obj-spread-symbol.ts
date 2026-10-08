// xl:title 对象展开该带符号键
// xl:round 692
// xl:judge stdout
// xl:end

const s = Symbol("s");
const t = { ...{ [s]: 7 } };
console.log(t[s], Object.getOwnPropertySymbols(t).length);
