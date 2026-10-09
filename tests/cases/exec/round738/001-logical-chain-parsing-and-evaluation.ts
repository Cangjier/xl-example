// xl:title 逻辑链（`&&` / `||` / `??`）的解析与求值：位置、结合性、短路与返回值
// xl:round 738
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域逐条一问的六条原子探针
// `p738b-b01` … `p738b-b06`，外加 `exec/round737/p737b-b06`
// （它标题里就写着「第 738 轮收掉的那一格，这里是它的守卫」，是同一个判定点），
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**逻辑链怎么解析、怎么求值**——简写箭头体不吃逗号、条件与嵌套三元的结合性、
// 短路只求值一次、交出的是操作数本身（不是布尔）、在 `yield` 与模板串插值里的位置。
{
  // b01 · 箭头函数体是逻辑链（简写体不吃逗号那一档）
  const f = (x: any) => x && 1;
  const g = (x: any) => (x || 2);
  const h = (x: any) => x ?? 3;
  console.log(f(5), g(0), h(null));
  const arr = [1, 2].map((x) => x && x * 2);
  console.log(arr.join(","));
  const obj = { m: (x: any) => x || "d" };
  console.log(obj.m(0));
}

{
  // b02 · 条件里的逻辑链与嵌套三元的结合性
  const pick = (a: any, b: any) => (a && b ? "both" : a ? "a" : b ? "b" : "none");
  console.log(pick(1, 1), pick(1, 0), pick(0, 1), pick(0, 0));
  const t = (x: any) => (x ? (x > 1 ? "big" : "one") : "zero");
  console.log(t(0), t(1), t(5));
  console.log((false || true) && (true ?? false));
}

{
  // b03 · 短路求值里的副作用只发生一次
  let calls = 0;
  const t = () => { calls += 1; return true; };
  console.log(t() && t(), calls);
  calls = 0;
  console.log((false && t()) || calls);
  console.log(calls);
  const o: any = { get v() { calls += 1; return 1; } };
  console.log(o.v && o.v, calls);
}

{
  // b04 · 逻辑链的返回值是**操作数本身**（不是布尔）
  console.log(0 || "x", "" || 0, null ?? "y", undefined ?? 0);
  console.log(1 && "z", "a" && 0, NaN || "w");
  console.log(([] || 1) === ([] as any), typeof (0 || ""), typeof (1 && 2));
}

{
  // b05 · `yield` 的逻辑操作数是**对象 / 调用 / 成员**时的形状
  function* g() {
    const o = { a: 1, b: 0 };
    yield o.a && o.b;
    yield o["a"] || o["b"];
    yield (o.a ? 1 : 2) && 3;
    yield o.a && (() => 4)();
  }
  console.log([...g()].join(","));
}

{
  // b06 · 模板串插值里的逻辑链
  const a: any = 0;
  const b: any = 1;
  console.log("v=" + (a || b) + " w=" + (a && b));
  console.log("x=" + (a ?? "n") + " y=" + (b && "m"));
  const s = (v: any) => "s:" + (v && "yes");
  console.log(s(1), s(0));
}

{
  // 737-b06 · `yield` 后面跟逻辑表达式（第 738 轮收掉的那一格，这里是它的守卫）
  function* h() { yield 1 && 2; yield 0 || 3; yield null ?? 4; }
  console.log([...h()].join(","));
}
