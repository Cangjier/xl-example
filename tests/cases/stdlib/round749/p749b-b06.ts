// xl:title `Error` 家族的形状与 `instanceof` 链
// xl:round 749
// xl:judge stdout
// xl:want differ
// xl:why `Error.stack` 那一格：Node 给**字符串**（`typeof (e as any).stack` 是 `"string"`），
// xl:why 本仓给 `undefined`。**与第 697 / 704 / 708 轮登记的是同一条根**
// xl:why （`Error` 的栈：语言层没有那一格，`Error.stackTraceLimit` / `captureStackTrace`
// xl:why 第 704 轮已经挂上了、**栈本身**没有）。
// xl:why **这一条不是新根**：本用例把它钉在 `Error` 家族的形状旁边（`message` / `name` /
// xl:why `instanceof` 链 / `Object.prototype.toString.call(e)` 那几格**都是对的**），
// xl:why 顺带量到 `class MyErr extends Error {}` 的实例形状两边一致。
// xl:why 收它要么真的攒一条栈（帧栈在手上，但「调用点文本」那一层没有），
// xl:why 要么像 Node 那样给一格**惰性**的 getter——两条都是新语义。
// xl:end
const e = new Error("m");
console.log(e.message, e.name, e instanceof Error, e instanceof TypeError);
console.log(Object.prototype.toString.call(e));
const t = new TypeError("tm");
console.log(t.message, t.name, t instanceof Error, t instanceof TypeError);
console.log(new RangeError("r").name, new SyntaxError("s").name, new ReferenceError("x").name);
console.log(typeof (e as any).stack, (e as any).constructor === Error);
class MyErr extends Error {}
const me = new MyErr("mine");
console.log(me.message, me.name, me instanceof MyErr, me instanceof Error, Object.keys(me).join(","));
