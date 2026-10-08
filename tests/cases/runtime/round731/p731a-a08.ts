// xl:title 对象方法 / 访问器 / 计算键那几档的 `name`
// xl:round 731
// xl:judge stdout
// xl:want differ
// xl:why **计算键方法的 `name` 取不到**：`({ ["c"]() {} }).c.name` 在 Node 里是 `"c"`
// xl:why （规范里那一步是 `SetFunctionName`，键是字符串就直接用它），本仓给**空串**。
// xl:why 根子在降级层：闭包的名字那一格只从**标识符**取（`FunctionNameHint` 那一套），
// xl:why 而计算键的成员名是 `ComputedPropertyName`、**不是**一个标识符 ⇒ 落到匿名那一档
// xl:why （符号键那一格两边一致：Node 给 `"[k]"` 形态的串、本仓给空串——
// xl:why  上面第二行量的正是「符号键不给名字」这一半，两边都对）。
// xl:why 要收它得在 `LowerFunctionValue` 的名字那条路上认「键是字符串字面量」这一档
// xl:why （`{ [1]() {} }` 的 `name` 在 Node 里是 `"1"`，同一处）——先原样登在这里。
// xl:end
const o = { m(a: number) {}, get g() { return 1; }, ["c"]() {} };
console.log(o.m.name, o.g.name, (o as any).c.name);
const s = Symbol("k");
const p = { [s](a: number) {} };
console.log(p[s].name === "k", typeof p[s].name);
