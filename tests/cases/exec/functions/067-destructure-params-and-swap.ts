// xl:title 解构参数与交换：函数签名里解构、解构赋值做交换
// xl:round 7
// xl:judge stdout
// xl:end

function f({ a, b = 2 }: { a: number; b?: number }, [c, d]: number[]): number { return a + b + c + d; }
console.log(f({ a: 1 }, [3, 4]), f({ a: 1, b: 10 }, [3, 4]));
let x = 1, y = 2;
[x, y] = [y, x];
const o: any = {};
({ v: o.v } = { v: 42 });
console.log(x, y, o.v);
