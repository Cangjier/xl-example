// xl:title 错误对象上的自定义字段 + 嵌套抛出 + `instanceof` 分派
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的一条并了进来**：probe694-x16（`const o = {}; o.f()`
// 抛的是 `TypeError`——属性不是函数也走同一族）。
// 判定点只有一个：**`instanceof` 分派得准不准（自己的子类 / 内置家族 / 引擎抛的）**。
class Http extends Error {
  status: number;
  constructor(status: number, msg: string) { super(msg); this.name = "Http"; this.status = status; }
}
try {
  try { throw new Http(404, "nf"); } catch (e) { throw e; }
} catch (e: any) {
  console.log(e.name, e.status, e.message, e instanceof Http, e instanceof Error);
}
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log("not-a-function:", show((function () { try { const o = {}; (o as any).f(); } catch (e) { return e.constructor.name; } })())); }
catch (e: any) { console.log("not-a-function:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
