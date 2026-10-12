// 语料 08：生成器（`function*` / `yield` / `for..of` 推着走 / 提前 return 收尾）。
//
// **只用 `for..of`**：本仓的生成器**直接迭代走的是迭代协议**✓，而 `.next()` 的返回值形状
// 与 JS 不同（这边给的是 `[值, 是否结束]` 的数组，JS 给 `{ value, done }`）✗——
// 那是一条**已记差异**，写进语料只会把差异当成缺口。

function* numbers(): number[] {
  yield 1;
  yield 2;
  yield 3;
}

function* capped(limit: number): number[] {
  for (let i = 0; i < 10; i++) {
    if (i >= limit) return;
    yield i;
  }
}

function* echoed(): string[] {
  yield "a";
  for (const value of numbers()) {
    yield "n" + value;
  }
}

let walked: string = "";
for (const value of numbers()) {
  walked += value + ",";
}
console.log("generator", walked);

let cappedOut: string = "";
for (const value of capped(4)) {
  cappedOut += value + ",";
}
console.log("early-return", cappedOut);

let echoedOut: string = "";
for (const value of echoed()) {
  echoedOut += value + ";";
}
console.log("nested", echoedOut);
