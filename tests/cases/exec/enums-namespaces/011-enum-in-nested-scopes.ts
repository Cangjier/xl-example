// xl:title 枚举名在内层作用域里可见（函数 / 箭头 / 立即调用 / 类方法）
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red = "r", Blue = "b" }
enum N { A = 1, B = 2 }
function inFunction(): string { return Color.Red; }
function inArrow(): number { return ((k: Color) => (k === Color.Blue ? 1 : 0))(Color.Blue); }
function inIife(): number { return (function (): number { return N.A + N.B; })(); }
function reverse(): string { return N[1]; }
class Holder { kind = Color.Blue; get(): string { return this.kind; } }
console.log(inFunction(), inArrow(), inIife(), reverse(), new Holder().get(), Color.Red);
