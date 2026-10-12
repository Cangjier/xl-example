// xl:title interface 只是形状：实现它的对象照跑
// xl:judge stdout
// xl:end

interface Point { x: number; y: number; label?: string }
interface Named extends Point { name: string }
const p: Point = { x: 1, y: 2 };
const n: Named = { x: 3, y: 4, name: "n" };
function dist(a: Point, b: Point) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
console.log(p.x, n.name, dist(p, n));
