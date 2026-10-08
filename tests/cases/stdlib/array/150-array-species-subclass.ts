// xl:title 继承数组的子类上 `map` / `concat` 交出什么
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 数组子类上的 `map` / `filter` 走的是 **`Symbol.species`**：JS 里 `MyArr.from([1,2,3]).map(…)`
//       交出的是 **`MyArr` 的实例**，本仓给普通数组（`instanceof MyArr` 假）。
//       要做——它要读 `constructor[Symbol.species]` 那一格。
// xl:end
class MyArr extends Array {}
const a: any = MyArr.from([1, 2, 3]);
const b: any = a.map((x: any) => x * 2);
console.log(b instanceof MyArr, b instanceof Array, b.length, JSON.stringify([...b]));
console.log(JSON.stringify([...a.filter((x: any) => x > 1)]));
