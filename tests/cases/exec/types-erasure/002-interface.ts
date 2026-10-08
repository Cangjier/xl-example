// xl:title interface：只活在类型位（用了它也不产生代码）
// xl:judge stdout
// xl:end

interface Point { x: number; y: number; label?: string }
interface Fn { (n: number): number }
function dist(p: Point): number { return p.x + p.y; }
const p: Point = { x: 1, y: 2 };
const f: Fn = (n) => n * 2;
console.log(dist(p), f(3), typeof p);
