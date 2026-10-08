// xl:title interface / type 在任何值位都不产生东西
// xl:round 371
// xl:judge stdout
// xl:end
interface Point { x: number; y: number; m?(): string }
type Alias = { a: string };
type Fn = (x: number) => string;
type Union = "a" | "b" | 1;
type Tup = [number, string?, ...boolean[]];
interface Ext extends Point { z: number }
const p: Point = { x: 1, y: 2 };
const f: Fn = (n) => String(n);
console.log(p.x + p.y, f(3), typeof ({} as Alias), (["a"] as Union[]).length, ([1] as Tup).length);
