// xl:title switch 上判别联合类型的几个成员：类型位不影响运行
// xl:judge stdout
// xl:end

type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };
function area(s: Shape) {
  switch (s.kind) {
    case "circle": return Math.round(3 * s.r * s.r);
    case "square": return s.side * s.side;
  }
}
console.log(area({ kind: "circle", r: 2 }), area({ kind: "square", side: 3 }));
