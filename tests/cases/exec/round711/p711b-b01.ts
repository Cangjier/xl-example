// xl:title 下标调用链当二元左操作数（字符串拼接）
// xl:round 711
// xl:judge stdout
// xl:want differ
// xl:why **二元运算符左边的链被截断**：`o[k]().v + ""` 的 token 形状是 `[PropertyAccess(o,[k]), BinaryOperator(PropertyAccess(call,.,v), +, "")]`——链上其余格被装进了 `BinaryOperator` 那一格，而 `projectExpression` 的链那一支只在 `kids[1]` 是「点号 / 下标 / 调用开头」时才进 ⇒ 这里整个让开，折成 `o[k] + ""`，拿到的是**那个函数自己**（Node 给 `1`）。第 711 轮收的是**一元前缀**那一半（`typeof` / `!` / `void` 的 `p711a-*`），**二元左操作数那一半还没认**。要做。
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(o[k]().v + "")); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
