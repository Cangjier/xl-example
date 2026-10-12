// xl:title 注释 / 换行落在可选链的每一格之间：`?.` 与它的括号要接得上
// xl:round 728
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域三条原子探针 `p728a-a01` … `a03`，
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**`?.` 与紧跟它的 `[` / `(` 之间的注释与换行不打断那一格**——
// `o?. /*c*/ [1]`、`a?.\n b?.\n [1]`、`fn?./*c*/(1)` 都要照常成形（端到端读数见 a02）。
{
  // a01 · `?.[` 与 `?.(`：注释 / 换行夹在 `?.` 与括号之间
  const o: any = { arr: [10, 20], m() { return 5; } };
  console.log(o?.["arr"]?.[1], o?.arr?.[0]);
  console.log(o?. /*c*/ arr /*c*/ ?. /*c*/ [1]);
  console.log(o?.
    arr?.
    [0]);
}

{
  // a02 · 注释 / 换行落在可选链的每一格之间（端到端读数）
  const a: any = { b: [1, 2, 3] };
  console.log(a?.b?./*x*/[1]);
  console.log(a?.b/*x*/?.[2]);
  console.log(a?./*x*/b?.[0]);
  console.log(a?.
    b?.
    [1]);
  const n: any = null;
  console.log(n?./*x*/[0], n?./*x*/().y);
}

{
  // a03 · `?.(` 的注释 / 换行：可选调用的实参表留在链上
  const fn: any = (x: number) => x + 1;
  console.log(fn?./*c*/(1), fn?.
    (2));
  const obj: any = { go(n: number) { return n * 2; } };
  console.log(obj.go?./*c*/(3), obj?.go?.(4));
  const none: any = null;
  console.log(none?./*c*/(5), none?.go?.(6));
}
