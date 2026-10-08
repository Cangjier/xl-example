// xl:title 符号键、访问器在渲染里露不露面
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
o[Symbol("s")] = 2;
Object.defineProperty(o, "h", { value: 3, enumerable: false });
console.log(o);
const g: any = {};
Object.defineProperty(g, "x", { get() { return 1; }, enumerable: true });
console.log(g);
