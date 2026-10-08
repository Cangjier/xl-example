// xl:title 可辨识联合：类型位擦除、值位照样缩窄
// xl:round 291
// xl:judge stdout
// xl:end

type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };
function area(x: Shape): number {
  if (x.kind === "circle") return 3 * x.r * x.r;
  return x.s * x.s;
}
console.log(area({ kind: "circle", r: 2 }), area({ kind: "square", s: 3 }));
