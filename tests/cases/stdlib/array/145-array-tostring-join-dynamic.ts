// xl:title `Array.prototype.toString` 要**现读** `this.join`（上一轮登记的缺口）
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `Array.prototype.toString` 在本仓是**指到 `join` 那一格能力号**的静态指针
//       （`array.xl.md` 第 193 轮的账），而 JS 的它要**现读** `this.join` 再调——
//       所以在实例上换掉 `join` 之后 `String(a)` 不变。要做：得给 `toString`
//       自己的能力号，并在里面走一次 `GetProperty(self, "join")`。
// xl:end
const a: any = [1, 2];
console.log(String(a), a + "");
a.join = function () { return "J"; };
console.log(String(a), a + "");
Array.prototype.toString.call({ join: () => "X" } as any);
console.log("ok");
