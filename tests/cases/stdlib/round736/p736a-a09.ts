// xl:title 符号键在 `keys` / `JSON` / `for..in` 与 `getOwnPropertySymbols` 里的可见性
// xl:round 736
// xl:judge stdout
// xl:end
const k = Symbol("kk");
const o: any = { a: 1 };
o[k] = 2;
console.log(Object.keys(o).join(","), JSON.stringify(o), Object.getOwnPropertySymbols(o).length);
let seen = "";
for (const key in o) seen += key;
console.log("forin:" + seen, Reflect.ownKeys(o).length);
console.log(o[k], Object.getOwnPropertyNames(o).join(","));
