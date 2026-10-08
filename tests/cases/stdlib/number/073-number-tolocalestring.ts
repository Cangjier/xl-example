// xl:title `toLocaleString` 那一族现在的样子
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `(1234.5).toLocaleString()` 本仓给 `[object Number]`（Node 给 `1,234.5`）：
//       第 689 轮装的 `Object.prototype.toLocaleString` 那一格转交给的是
//       **`Object.prototype.toString`**，而 JS 转交的是**接收者自己的** `toString`。
//       要做；而 `1,234.5` 那三位分组是**区域设置**的账（本仓明说没有区域设置），
//       两者要一起定。
// xl:end
console.log((1234.5).toLocaleString(), (1234.5).toString());
console.log(typeof (1234.5 as any).toLocaleString);
console.log(new Date(0).toLocaleString === undefined ? "no-date" : "has-date");
