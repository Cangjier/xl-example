// xl:title 可选链与非空断言混用
// xl:round 291
// xl:judge stdout
// xl:end

const o: any = { a: { b: 1 } };
console.log(o?.a?.b, o!.a!.b, o?.["a"]?.["b"]);
console.log(o.m?.[0], (o as any).z?.y);
