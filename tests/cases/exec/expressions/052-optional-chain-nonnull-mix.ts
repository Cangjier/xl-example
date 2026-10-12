// xl:title 可选链与非空断言混在同一条链上
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { a: { b: 1 } };
console.log(o?.a!.b, o.a?.b, o?.a?.b, o?.a!.b! + 1);
