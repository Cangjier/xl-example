// xl:title 解构形参与默认值
// xl:round 291
// xl:judge stdout
// xl:end

function f({ a, b = 2 }: { a: number; b?: number }, [c, d = 4]: number[] = [3]) { return a + b + c + d; }
console.log(f({ a: 1 }), f({ a: 1, b: 10 }, [1, 2]));
