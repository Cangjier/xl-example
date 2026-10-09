// xl:title `finally` 对突然收场的接管：`return` 覆盖、`break` 穿过、`throw` 被吞
// xl:round 736
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收 `exec/round736/p736c-c09` 与
// `exec/round742/p742b-b04` 两条原子探针（`finally` 与突然收场的关系被写了两遍），
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**`finally` 在每条出口路径上都跑、且谁的话算数**——
// `try` 里的 `return` 被 `finally` 里的 `return` 覆盖、`finally` 只打印时返回值不变、
// `finally` 里的 `return` 把 `throw` 吞掉、`switch` 里的 `break` 也要先走 `finally`。
{
  // c09 · `try` / `finally` 里 `return` 覆盖与 `finally` 的抛
  function f() { try { return "try"; } finally { return "finally"; } }
  console.log(f());
  function g() { try { return "try"; } finally { console.log("clean"); } }
  console.log(g());
  function h() { try { throw new Error("e"); } finally { return "swallow"; } }
  console.log(h());
}

{
  // b04 · `switch` 与 `try` / `finally`：`break` 走 `finally`
  function f(x: number): string {
    const log: string[] = [];
    switch (x) {
      case 1:
        try {
          log.push("try");
          break;
        } finally {
          log.push("finally");
        }
      default: log.push("def");
    }
    log.push("end");
    return log.join(",");
  }
  console.log(f(1));
  console.log(f(2));
}
