// xl:title 第 863 轮：链的续格与更松的运算符折进同一个单元（三元操作数 / 逗号在语句层）
// xl:round 863
// xl:judge stdout
// xl:end
// **判据只有一条**：链头是**前一个单元的最后一个孩子**、续格是**后一个单元的第一个孩子**时，
// 两个运算符之间那一层不能丢——`1 + o["f"]().v + 2` 必须是 `(1 + o["f"]().v) + 2`
//（形状对了值才对：少一层会把 `+ 2` 折进链那一侧；逗号那一档更狠，直接变成 `x = (…, y)`）。
{
  // 863-a01 · 三元操作数、中间那个是下标调用链
  const o: any = { f: () => ({ v: 1 }) };
  console.log(1 + o["f"]().v + 2);
  console.log(1 + o["f"]().v * 2 + 3);
  console.log(1 + o["f"]().v + 2 + 3);
  console.log(2 - o["f"]().v - 1);
  console.log((1 + o["f"]().v) * 2);
}

{
  // 863-a02 · 逗号在语句层：切点落在最外面那层赋值上
  const o: any = { f: () => ({ v: 1 }) };
  let x: any;
  let y: number = 7;
  x = 1 + o["f"]().v, y;
  console.log(x, y);
  x = 1 + o["f"]().v + 2, y;
  console.log(x, y);
  x = (1 + o["f"]().v + 2, 5);
  console.log(x);
}
