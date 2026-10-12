// xl:title 接口 / 类型别名 / 泛型参数在运行期完全擦除
// xl:round 9
// xl:judge stdout
// xl:end

interface Point { x: number; y: number; }
type Pair<T> = [T, T];
function mid<T extends Point>(a: T, b: T): Point {
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  return { x, y } as Point;
}
const p: Pair<Point> = [{ x: 0, y: 0 }, { x: 4, y: 6 }];
console.log(JSON.stringify(mid(p[0], p[1])));
const asConst = { a: 1 } as const;
console.log(JSON.stringify(asConst));
