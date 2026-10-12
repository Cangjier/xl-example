// xl:note 实例化表达式后面紧跟模板串 ⇒ **一条** `TaggedTemplateExpression`（第 979 轮 · 投影 0a-1 支）。
//        `<…>` 是这条标签模板**自己的** `typeArguments`（不是被实例化的 `ExpressionWithTypeArguments`），
//        与 `CallExpression` 带 `typeArguments` 同一个口径；尾巴那几档（`.c` / `+ 1` / 第二个模板 /
//        模板装在 `PropertyAccess` 里）分别走 0b / 0c / 0d 同一套接法，`chainOnto` 也补了
//        「紧跟一格反引号模板 ⇒ 再标一次」这一档（`f<T>`t``u`` 是**嵌套两条**标签模板）。
// xl:round 979
// xl:end
const a = f<T>`t`;
const b = f<A, B>`t`;
const c = f<T>`${1}`;
const d = f<T>`t`.c;
const e = a.b.c<T>`t`;
const g = (a.b)<T>`t`;
const h = f<T>`t` + 1;
const i = f<T>`t``u`;
const j = f<T>`a`.b`c`;
const k = x < y > `t`;
