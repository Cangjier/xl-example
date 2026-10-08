// xl:title `Array.prototype.slice.call(arguments)` 那个惯用法
// xl:round 691
// xl:judge stdout
// xl:end
function f(): number[] { return Array.prototype.slice.call(arguments); }
console.log(JSON.stringify(f(1, 2, 3)));
function g(): string { return [].join.call(arguments, "-"); }
console.log(g("a", "b"));
function h(): number { return Array.prototype.reduce.call(arguments, (a: any, b: any) => a + b, 0); }
console.log(h(1, 2, 3));
