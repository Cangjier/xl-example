// xl:title 第 864 轮：对象字面量值位上的数组（括号化对象 / 实参里的对象 / 数组里的对象）
// xl:round 864
// xl:judge stdout
// xl:end
// **判据**：`({ w: [5 | 6] })` 里那个 `[` 是**值位**——`|` / `&` / `^` 是位运算而不是类型运算符。
// 修之前这一档折成 `UnionType` / `IntersectionType`，降级层报
// `unimplemented: expression UnionType`（**整份文件进不来**）。
{
  const a = ({ w: [5 | 6] }).w;
  console.log(a[0], a[1], a[0] | a[1]);
}
{
  const f = (o: any) => o.z;
  const z = f({ z: [3 & 4] });
  console.log(z[0], z[1], z[0] & z[1]);
}
{
  const arr = [{ a: [1 | 2] }];
  console.log(arr[0].a[0] | arr[0].a[1]);
}
{
  const g = (o: any) => o.p;
  const p = g(({ p: [7 ^ 8] }));
  console.log(p[0] ^ p[1]);
}
{
  const deep = { q: [({ r: [1 | 2] })] };
  console.log(deep.q[0].r[0] | deep.q[0].r[1]);
}
