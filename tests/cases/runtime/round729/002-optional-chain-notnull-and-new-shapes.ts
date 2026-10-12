// xl:title 可选链 / 非空断言与 `new` 混用：**过掉的**那些形状
// xl:round 729
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收 `p729a-a02` 与 `p729a-a04`（两条都问
// 「可选链 / 非空断言接在 `new` 出来那个对象上时对不对」，也都在过），
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 这一条是 `001-…-differ` 的**守卫**：那条量的两条根被收掉之后，
// 这里这些形状一个都不许跟着坏（成员那一格的两个位置、`?.["v"]`、`!` 取成员）。
{
  // a02 · 过掉的形状：`new` + 可选链 / 非空断言（除上面那一格之外都对）
  class C { v = 1; m() { return this.v; } }
  const o: any = new C();
  console.log(o.v, o.m());
  console.log((new C())?.["v"], new C().v);
  console.log((o as any)!.v, o!.v);
}

{
  // a04 · 可选链 + 非空断言（成员那一格的两个位置都对）
  const o: any = { m() { return 7; }, n: { k: 1 } };
  console.log(o?.n!.k, o?.n!.k!);
  console.log(o.m!(), o.n!.k);
}
