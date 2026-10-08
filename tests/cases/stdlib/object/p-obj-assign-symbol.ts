// xl:title Object.assign 该复制符号键
// xl:round 692
// xl:judge stdout
// xl:end

const s = Symbol("s");
const t = Object.assign({}, { [s]: 1, a: 2 });
console.log(t[s], Object.getOwnPropertySymbols(t).length);
