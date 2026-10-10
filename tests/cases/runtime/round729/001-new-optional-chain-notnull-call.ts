// xl:title `new` 与可选链 / 非空断言 / 下标混用
// xl:round 729
// xl:judge stdout
// xl:note 第 962 轮转绿（`xl:want differ` 与台账按规矩撤掉，用例留着当守卫）。
// 第 729 轮登记的是**两条根**，同一轮把它们量在一份语料里：
// ① `o?.m?.()` 原来被收成**两个平级的 NCO**（`o` + `NCO(m)` + `NCO(括号)`）
//   ⇒ 降级层把中间那一格当成**实参表**、没有调用节点 ⇒ 那一格**静默给 `undefined`**；
// ② `o!.m!()` 被收成 `NCO(Method(m, NotNull, 括号))` ⇒ 投影出的
//   `PropertyAccessExpression.name` 是空 `Identifier`、`arguments` 是 `[]`
//   ⇒ 降级层报 `cannot call a non-closure value`（**整份脚本在这里断**）。
//
// **第 962 轮把两条都收掉了**，落点都在投影那一层（不是 token 层）：
// ② 是「空名字 `Method` 的第一格是 `NotNull`」那一支在**普通链那条路**漏了
//（`chainWithOptional` / `chainOnto` 第 852 轮有，链上这一份没有）；
// ① 是**链成员那一格是下标括号**时 `chainWithOptional` 按成员名折
//（投出名叫 `"[0]"` 的 `Identifier`）——与 `chainOnto` 里那一支同形同修。
// xl:end
// 第 803 轮改名（原 `p729a-a01`）：`xl:want` / `xl:why` 与正文一字未动。
// 同族的**过掉的**那些形状在同域 `002-optional-chain-notnull-and-new-shapes`（那是守卫）。
class C { v = 1; m() { return this.v; } }
const o: any = new C();
console.log(o?.v, o?.m?.(), (new C())?.["v"], new C().v);
console.log((o as any)!.v, o!.v, o!.m!());
