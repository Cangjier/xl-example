// xl:title 泛型的运行期：类型参数一律擦除，函数体照跑
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function first<T>(xs: T[]): T { return xs[0]; }
function pair<A, B>(a: A, b: B): [A, B] { return [a, b]; }
class Box<T> { constructor(public value: T) {} get(): T { return this.value; } }
console.log(first<number>([1, 2]), pair("a", 1).join(":"), new Box<string>("v").get());
interface Wrap<T> { value: T }
const w: Wrap<number> = { value: 3 };
console.log(w.value);
