// xl:title 符号键：不进制符串键表、能读回来
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { a: 1, [s]: 2 };
console.log(Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length, o[s]);
