// xl:title 下标调用链 `o[k]().v` 落在各种操作数位上：二元两侧、比较 / 逻辑、再取成员
// xl:round 743
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域四条原子探针 `p743a-a01` … `a04`，
// 外加 `exec/round744/p744a-a01`（它的一元前缀版）与
// `exec/expressions/r692-element-call-then-member`（第 692 轮修的那个根本身：
// 计算成员调用之后再取成员，`o["f"]().v` 整段丢），正文逐句搬进各自的块里，
// 打印口径与探针一字不差。
// 判据只有一条：**下标调用链是一个完整的单元**——`o[k]()` 之后再取 `.v`，
// 整段当二元的左 / 右操作数、当比较与逻辑的操作数、再往后接后缀（字符串化 / 下标 / 加减），
// 以及一元前缀打在它前面时那一格之差。
{
  // a01 · 下标调用链当**二元左操作数**
  const o: any = { f: () => ({ v: 1 }) };
  const k = "f";
  console.log(o["f"]().v + 1);
  console.log(o[k]().v + 1);
  console.log(o["f"]().v * 2 + 1);
  console.log(o["f"]().v + "");
}

{
  // a02 · 下标调用链当**二元右操作数**
  const o: any = { f: () => ({ v: 1 }), g: (n: number) => ({ v: n }) };
  const k = "f";
  console.log(1 + o["f"]().v);
  console.log(1 + o[k]().v);
  console.log(o["g"](5).v + 2);
  console.log(10 - o["f"]().v);
}

{
  // a03 · 下标调用链当**比较 / 逻辑**的操作数
  const o: any = { f: () => ({ v: 1 }) };
  const n: any = { f: () => ({ v: 0 }) };
  console.log(o["f"]().v === 1, o["f"]().v !== 2);
  console.log(o["f"]().v && 2, n["f"]().v || "fallback");
  console.log(o["f"]().v ?? 5, n["f"]().v ?? 5);
  console.log(o["f"]().v > 0, o["f"]().v < 0);
}

{
  // a04 · 下标调用链**再往后接后缀**
  const o: any = { f: () => ({ v: 1, w: { z: 9 } }) };
  console.log(o["f"]().v.toString() + "");
  console.log(typeof o["f"]().v);
  console.log(o["f"]().w.z + 1);
  console.log(o["f"]().v + 0);
}

{
  // 744-a01 · 一元前缀 + 下标调用链 + 更松的二元
  const o: any = { f: () => ({ v: 1 }), s: () => ({ v: "x" }) };
  console.log(typeof o["f"]().v + "");
  console.log(typeof o["f"]().v === "number");
  console.log(!o["f"]().v + "");
  console.log(typeof o["s"]().v + "!");
}

{
  // 692 · 计算成员调用之后再取成员（`o["f"]().v` / `a["values"]().next().value`）
  // **第 692 轮修的那一格**：token 层把这种写法给成**两格**（`PropertyAccess(o["f"])`
  // 与 `PropertyAccess(Bracket(()), ., v)`），投影层的链那一支只看 `kids[1]` 是不是
  // `.` 或下标 ⇒ 整个让开 ⇒ 只投 `kids[0]`。症状是**静默错值**：打印出**函数自己**。
  const o = { f() { return { g() { return 7; }, v: 5 }; } };
  console.log(o["f"]().v);
  console.log(o["f"]().g());
  const key = "values";
  const a = [1, 2, 3];
  console.log(a[key]().next().value);
  console.log(a[Symbol.iterator]().next().value);
  console.log("ab"[Symbol.iterator]().next().value);
}
