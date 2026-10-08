// xl:title 计算成员调用之后再取成员（`o["f"]().v` / `a["values"]().next().value`）
// xl:round 692
// xl:judge stdout
// xl:end
// **第 692 轮修的那一格**：token 层把这种写法给成**两格**（`PropertyAccess(o["f"])`
// 与 `PropertyAccess(Bracket(()), ., v)`），投影层的链那一支只看 `kids[1]` 是不是
// `.` 或下标 ⇒ 整个让开 ⇒ 只投 `kids[0]`。症状是**静默错值**：打印出**函数自己**。
const o = { f() { return { g() { return 7; }, v: 5 }; } };
console.log(o["f"]().v);
console.log(o["f"]().g());
const key = "values";
const a = [1, 2, 3];
console.log(a[key]().next().value);
console.log(a[Symbol.iterator]().next().value);
console.log("ab"[Symbol.iterator]().next().value);
