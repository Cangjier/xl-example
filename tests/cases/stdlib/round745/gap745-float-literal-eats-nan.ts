// xl:title `flat(NaN)` 与同一句里的浮点字面量：那个 `NaN` 被前一个字面量顶掉
// xl:round 745
// xl:judge stdout
// xl:want differ
// xl:why **本仓把一个 `NaN` 实参读成了**同一个语句里**那个浮点字面量的值。
// xl:why 三行的期望值都是「不摊」（`NaN` 过 `ToIntegerOrInfinity` 是 `0`），
// xl:why 而本仓三行都给「摊一层」——也就是那个 `1.9` 折出来的 `1`。
// xl:why
// xl:why **根子不在 `flat`**：`IntArgOr` / `IntOfNumber` 那一对是好的——
// xl:why `flat(NaN)` **单独一个语句**时两边一致（`p745a-a02` 最后一行钉着它），
// xl:why `Math.max(1.9, 1)` 与 `Math.max(NaN, 1)` 在同一句里也对（第 206 轮那两支）。
// xl:why 这一条要的是「**同一个表达式里有一个浮点字面量常量 + 一个运行期算出来的 `NaN`**」
// xl:why 同时喂给同一个内建的两个调用点——**实参那一格被上一次的值顶掉了**。
// xl:why 量过的边界：把 `NaN` 先存进一个 `const n = NaN` 再传，**照样错**；
// xl:why 把 `1.9` 换成整数（`1` / `2`）也**照样错**（`a.flat(2)` 之后 `flat(NaN)` 给摊两层）；
// xl:why 把两句拆到两个 `console.log` 里就**对了**——所以它是**语句内**的实参落格。
// xl:why
// xl:why **这是一个真错值**（`NaN` 与 `0` 在 `flat` 里是不同的深度），
// xl:why 但它窄：**只有「同一个语句里还有一个浮点/整数字面量实参」才碰得到**。
// xl:why 要收它得先看降级层那两句调用的实参槽是怎么分配的——
// xl:why 那与本轮四处（`flat` 深度、`padStart`/`repeat` 的乘积溢出、`reduce` 消息、`-0`）不是同一处，
// xl:why 所以如实登在这里，**不猜**。
// xl:end
const a = [1, [2, [3]]];
console.log(JSON.stringify(a.flat(1.9)), JSON.stringify(a.flat(NaN)));
console.log(JSON.stringify(a.flat(2)), JSON.stringify(a.flat(NaN)));
console.log(JSON.stringify(Math.floor(1.9)), JSON.stringify(a.flat(NaN)));
const b = [1, [2, [3]]];
console.log(JSON.stringify(b.flat("2")), JSON.stringify(b.flat("x")));
