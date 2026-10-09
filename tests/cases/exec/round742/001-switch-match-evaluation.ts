// xl:title `switch` 的判别式与 `case` 比较：严格相等、只求值一次、走过的才求值
// xl:round 742
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域三条原子探针 `p742b-b02` · `b03` · `b07`，
// 外加 `exec/round736/p736c-c12`（同一个判定点在两个域里各写了一遍），
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**判别式与 `case` 表达式怎么比、各求值几次**——
// 严格相等（`1` 与 `"1"` 不同格、`NaN` 谁也匹配不上）、判别式只求值一次、
// `case` 按写的次序逐个求值到命中为止（`break` 之后那一格不求值）、
// 判别式可以是 `typeof` 这类表达式。
{
  // b02 · 判别式是**自增表达式**：只求值一次
  let i = 0;
  switch (i++) {
    case 0: console.log("zero", i); break;
    default: console.log("d", i);
  }
  console.log(i);
}

{
  // b03 · `switch` 里 `break` 之后那一格不跑、`case` 里调用的副作用只发生一次
  const log: string[] = [];
  const t = (s: string) => { log.push(s); return s; };
  switch (t("d")) {
    case t("a"): log.push("A"); break;
    case t("d"): log.push("D"); break;
    case t("e"): log.push("E"); break;
  }
  console.log(log.join(","));
}

{
  // b07 · `switch` 判别式是 `typeof` / `instanceof` 这类表达式
  function f(x: any): string {
    switch (typeof x) {
      case "number": return "number";
      case "string": return "string";
      case "object": return x === null ? "null" : "object";
      default: return "other";
    }
  }
  console.log(f(1), f("s"), f(null), f([]), f(true), f(undefined));
}

{
  // 736-c12 · `switch` 的落空与严格相等（NaN / 字符串数字）
  function pick(v: any) {
    switch (v) {
      case 1: return "one";
      case "1": return "str-one";
      case NaN: return "nan";
      default: return "other";
    }
  }
  console.log(pick(1), pick("1"), pick(NaN), pick(2));
  let n = 0;
  switch (2) { case 1: n += 1; case 2: n += 2; case 3: n += 3; break; default: n += 9; }
  console.log(n);
}
