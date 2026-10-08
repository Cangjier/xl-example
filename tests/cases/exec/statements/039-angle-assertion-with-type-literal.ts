// xl:title 尖括号断言的类型是**类型字面量**（`<{ n: number }>{ n: 1 }`）——**还没修**
// xl:round 387
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// 尖括号断言的**类型字面量**后面的那个**值**没有被收成对象字面量。
// **token 层是对的**（XML 实测）：外层是 GenericType、里面是 TypeLiteral、
// 紧跟着一格**裸的 Bracket**——那一格没有变成 ObjectLiteral。
// **根子在那一格的归属**：IsStatementStart 说「这是语句开头」⇒
// JsonObjectReorganization 让路 ⇒ 投影把它投成一个 **Block** ⇒
// 降级层报 unimplemented: expression Block（整份文件进不来）。
// **已试过、没生效**：在 IsStatementStart 里把「前一格是 GenericType」判成
// 「不是语句开头」——形状一点没变（说明那一格的让路不经过它）。
// **边界**：<number>x 好；花括号作为**类型**（断言里那半）好——
// 只有「断言的类型是类型字面量、后面紧跟一个对象字面量」这一格。
const a = <{ n: number }>{ n: 1 };
console.log("A", a.n);
const b = (<{ n: number; m?: string }>{ n: 2, m: "x" }).m;
console.log("B", b);
