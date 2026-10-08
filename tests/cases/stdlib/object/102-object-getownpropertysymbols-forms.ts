// xl:title Object.getOwnPropertySymbols：只收自有 Symbol 键、继承的不算
// xl:judge stdout
// xl:end

const s1 = Symbol("a");
const proto = { [Symbol("p")]: 1 };
const o: any = Object.create(proto);
o[s1] = 2;
o.n = 3;
console.log(Object.getOwnPropertySymbols(o).length, Object.getOwnPropertySymbols(o)[0] === s1);
console.log(Object.getOwnPropertySymbols(proto).length, Object.keys(o).join(","));
