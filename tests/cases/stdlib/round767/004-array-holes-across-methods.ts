// xl:title 数组的洞：`map` / `forEach` / `for..of` / `keys` / `JSON` 各走哪一条
// xl:round 767
// xl:judge stdout
// xl:note 洞（`[1, , 3]`）在这一族里有**三套口径**，这一条一次钉住：
// xl:note ① **跳过洞的**：`forEach` / `map` / `filter` / `some` / `every` / `reduce`（回调不进洞）；
// xl:note ② **按 `length` 走、洞给 `undefined` 的**：`for..of` / 展开 / `Array.from`；
// xl:note ③ **看不见洞的**：`Object.keys`（只列有值的下标）、`for..in`、`JSON.stringify`（洞写 `null`）。
// xl:note `includes(undefined)` 与 `indexOf(undefined)` 那一对正是 ①② 的分界。
// xl:end
const a: any[] = [1, , 3];
console.log("01", a.length, 1 in a, 0 in a);
const seen: string[] = [];
a.forEach((v, i) => seen.push(i + ":" + v));
console.log("02", seen.join(","));
console.log("03", a.map((v) => String(v)).join(","));
console.log("04", Object.keys(a).join(","), JSON.stringify(a));
const of: string[] = [];
for (const v of a) of.push(String(v));
console.log("05", of.join(","));
const ks: string[] = [];
for (const k in a) ks.push(k);
console.log("06", ks.join(","));
console.log("07", a.filter(() => true).length, a.includes(undefined), a.indexOf(undefined));
console.log("08", [...a].length, Array.from(a).length, a.reduce((s, v) => s + (v === undefined ? 0 : v), 0));
