// xl:title `extends Array` 与类数组接收者
// xl:round 338
// xl:judge stdout
// xl:end

class Stack extends Array {
  peek() { return this[this.length - 1]; }
  push2(v: number) { this.push(v); return this; }
}
const s = new Stack();
s.push2(1).push2(2).push2(3);
console.log(s.length, s.peek(), s.join(","), Array.isArray(s), s instanceof Stack, s instanceof Array);
console.log(s.slice(1).join(","), s.map((v: number) => v * 2).join(","));
const args = { 0: "x", 1: "y", 2: "z", length: 3 };
console.log(Array.prototype.slice.call(args as any, 1).join("-"));
function gather(): string { return ([] as any).slice.call(arguments as any).join("|"); }
console.log(gather("p", "q", "r"));
