// xl:title 原始值上的属性读：`"abc".length` / 数字的方法 / 自动装箱
// xl:round 750
// xl:judge stdout
// xl:want differ
// xl:why **内建方法不是同一个对象**：`n["toFixed"] === Number.prototype.toFixed` 在 Node 里是
// xl:why **真**，本仓给**假**（判据第 5 行 `5.00 true` 对 `5.00 false`）。
// xl:why 根在**每次取属性都新造一个宿主引用**（`CreateHostRef`）——`vm.xl.md` 的
// xl:why `CreateHostRef` 那一段自己写着这条教训（第 733 轮）：
// xl:why 「**每次都 `AllocateRaw`** ⇒ 同一个内建号上可以有好几个**互不相等**的句柄」；
// xl:why `BuiltinHostRef` 就是为这一格立的（取能力表里那一个）。
// xl:why `Number.prototype.toFixed` 走的是**另一条路**（原型那一格的能力表项），
// xl:why 所以修法是把「读内建方法」与「取能力表里那一个」接起来——
// xl:why 与第 733 轮的 `p733a-a01` 同一族，只是落在 `Number.prototype` 这一格上。
// xl:why **用户看得见**：`arr.map(Number.prototype.toFixed)` / `===` 比较 / `Set` 去重都会因此不同。
// xl:end
console.log("abc".length, "abc"[1], (1).toString(), (1.5).toFixed(1));
console.log((123).toString().length, true.toString(), (true as any).valueOf());
let s: any = "abc";
console.log(s.length, s[0], s.toUpperCase());
s.x = 1;
console.log(s.x, typeof s.x);
const n: any = 5;
console.log(n.toFixed(2), n["toFixed"] === Number.prototype.toFixed);
console.log("abc".length, (5).constructor === Number);
