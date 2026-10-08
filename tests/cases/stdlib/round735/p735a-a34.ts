// xl:title `Set.prototype.keys` 与 `values` 是**同一个函数对象**
// xl:round 735
// xl:judge stdout
// xl:end
// JS 里 `Set.prototype.keys === Set.prototype.values`（`[Symbol.iterator]` 也指同一个）——
// 本仓原来把 `SetKeys` **也放进安装表**，两格各 `CreateHostRef` 一次
// ⇒ **两个互不相等的句柄**（`new Set().keys === new Set().values` 给假）。
// **名字也跟着那一格**：两处都是 `"values"`（它只有一个名字）。
const s = new Set([1, 2, 3]);
console.log(s.keys === s.values, s[Symbol.iterator] === s.values, s.entries === s.values);
console.log(Set.prototype.keys === Set.prototype.values);
console.log(s.keys.name, s.values.name, s.keys.length, s.values.length);
console.log(JSON.stringify([...s.keys()]), JSON.stringify([...s.values()]));
