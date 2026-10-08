// xl:title Symbol：description / toString / 唯一性 / 作为键
// xl:judge stdout
// xl:end

const a = Symbol("d");
const b = Symbol("d");
console.log(a === b, a.description, String(a), a.toString() === String(a));
const key = Symbol("k");
const o: any = { [key]: 1, plain: 2 };
console.log(o[key], Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length);
