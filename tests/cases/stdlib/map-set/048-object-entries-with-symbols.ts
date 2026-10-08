// xl:title `Object.entries` 含符号键吗（不含），`getOwnPropertySymbols` 含
// xl:round 305
// xl:judge stdout
// xl:end

const s = Symbol("s");
const o: any = { a: 1, [s]: 2 };
console.log(Object.entries(o).length, Object.getOwnPropertySymbols(o).length, Object.keys(o).join(","));
