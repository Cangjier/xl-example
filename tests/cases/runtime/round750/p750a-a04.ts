// xl:title 原始值上的属性读：`"abc".length` / 数字的方法 / 自动装箱
// xl:round 750
// xl:judge stdout
// xl:end
// 第 750 轮登记的那一格（第 5 行 `n["toFixed"] === Number.prototype.toFixed`）在第 777 轮
// 收掉了：**根是 `get_index` 自己多出来的一句早退**（`!IsObject() ⇒ undefined`），
// 而点号那一路（`RtOp.GetProp`）一直无条件交给 `GetProperty`（它自己会装箱）。
// 用例留着当守卫。下面那几行钉的仍是这一族的其余面。
console.log("abc".length, "abc"[1], (1).toString(), (1.5).toFixed(1));
console.log((123).toString().length, true.toString(), (true as any).valueOf());
let s: any = "abc";
console.log(s.length, s[0], s.toUpperCase());
s.x = 1;
console.log(s.x, typeof s.x);
const n: any = 5;
console.log(n.toFixed(2), n["toFixed"] === Number.prototype.toFixed);
console.log("abc".length, (5).constructor === Number);
