// xl:title 鸭子类型：结构化对象在运行期只是一组键
// xl:round 371
// xl:judge stdout
// xl:end
type Point = { x: number; y: number };
type Move = (p: Point, by: number) => Point;
const move: Move = (p, by) => ({ x: p.x + by, y: p.y + by });
const points: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 2 }];
console.log(points.map((p) => move(p, 1)).map((p) => p.x + ":" + p.y).join(","));
const asJson = JSON.parse('[{"x":3,"y":4}]') as Point[];
console.log(asJson[0].x, asJson.length, "x" in asJson[0], "z" in asJson[0]);
function area(p: Point): number { return p.x * p.y; }
console.log(points.map(area).join(","));
