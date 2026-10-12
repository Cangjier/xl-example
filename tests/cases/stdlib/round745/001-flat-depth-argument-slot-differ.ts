// xl:title flat 的深度实参落格：字面量顶掉同句里另一格的参数（账）
// xl:round 790
// xl:judge stdout
// xl:want differ
// xl:why 同一个语句里若另有一个浮点 / 整数字面量实参，本仓会把**这一格的实参读成那一格的值**：
// xl:why `a.flat(1.9)` 之后的 `a.flat(NaN)` 拿到 `1`（Node 给 0，不摊）、
// xl:why `a.flat(Infinity)` 拿到 `1.9` 折出来的 1（Node 摊到底）。
// xl:why 根子是**语句内**的实参槽分配（`IntArgOr` / `IntOfNumber` 那一对本身是对的：
// xl:why 单独一个语句、以及把两条拆到两个 `console.log` 时两边一致）。
// xl:why 与「字符串 / 对象实参走 ToNumber」那一档无关——那两档是对的，当守卫留在下面。
// xl:why 要收它得先看降级层那两句调用的实参槽怎么分配，第 745 轮如实登在这里，**不猜**。
// xl:end

const a = [1, [2, [3]]];
console.log(JSON.stringify(a.flat(Infinity)), JSON.stringify(a.flat(1.9)));
console.log(JSON.stringify(a.flat(1.9)), JSON.stringify(a.flat(Infinity)));

(() => {
const a = [1, [2, [3]]];
console.log(JSON.stringify(a.flat(1.9)), JSON.stringify(a.flat(NaN)));
console.log(JSON.stringify(a.flat(2)), JSON.stringify(a.flat(NaN)));
console.log(JSON.stringify(Math.floor(1.9)), JSON.stringify(a.flat(NaN)));
const b = [1, [2, [3]]];
console.log(JSON.stringify(b.flat("2")), JSON.stringify(b.flat("x")));
})();

(() => {
const a = [1, [2, [3]]];
console.log(JSON.stringify(a.flat("2")));
console.log(JSON.stringify(a.flat({ valueOf: () => 2 } as any)));
console.log(JSON.stringify(a.flat({ valueOf: () => 0 } as any)));
console.log(JSON.stringify(a.flat({ toString: () => "2" } as any)));
console.log(JSON.stringify(a.flat(null as any)), JSON.stringify(a.flat(true as any)));
console.log(JSON.stringify(a.flat(0)));
})();
