// xl:title Function.prototype.bind：偏实参、this、new、length/name
// xl:round 371
// xl:judge stdout
// xl:end
function add(a: number, b: number, c: number) { return a + b + c; }
const one = add.bind(null, 1);
console.log(one(2, 3), one.length, one.name);
const ctx = { base: 10, add(this: any, x: number) { return this.base + x; } };
const bound = ctx.add.bind({ base: 100 });
console.log(bound(1), ctx.add(1));
function Point(this: any, x: number) { this.x = x; }
const BoundPoint = Point.bind(null);
console.log(new (BoundPoint as any)(5).x);
