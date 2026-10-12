// xl:title `yield` 与逻辑链的**求值次序**（短路要从左到右）
// xl:round 738
// xl:judge stdout
// xl:end
// 第 803 轮改名（原 `p738a-a06`；正文一字未动）。
// 判定点只有一个：**逻辑链的短路次序**——`yield side("l", 1) && side("r", 2)` 里
// 左边那一格先求值、右边只在需要时求；`yield` 把值交出去之后 `next(实参)` 的注入照旧。
// （这一条是「生成器 + 手动 `next()`」，所以它**没有**并进同域那两条合并条：
//  第 798 轮起就实测过生成器那一族进不了合并壳——放进块里会静默丢输出。）
const log: string[] = [];
function side(tag: string, value: any) { log.push(tag); return value; }
function* g() { const v = yield side("l", 1) && side("r", 2); return v; }
const it = g();
console.log(side("left", 0) && side("never", 1));
console.log(JSON.stringify(it.next()), JSON.stringify(it.next(9)));
console.log(log.join(","));
