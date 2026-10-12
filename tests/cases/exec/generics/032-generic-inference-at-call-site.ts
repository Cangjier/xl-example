// xl:title 调用点上显式类型实参与推断的结果一致
// xl:round 371
// xl:judge stdout
// xl:end
function wrap<T>(v: T): { v: T } { return { v }; }
function tuple<A, B>(a: A, b: B): [A, B] { return [a, b]; }
const a = wrap(1);
const b = wrap<string>("s");
const c = tuple(1, "x");
const d = tuple<number, string>(2, "y");
console.log(a.v, b.v, c.join("-"), d.join("-"), wrap<boolean>(true).v);
class Queue<T> { items: T[] = []; push(v: T): void { this.items.push(v); } pop(): T | undefined { return this.items.shift(); } }
const q = new Queue<number>();
q.push(1);
console.log(q.pop(), q.pop());
