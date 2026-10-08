// xl:title 可选调用与 `delete` / 赋值目标的排布
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { m() { return 1; }, p: { q: 1 } };
console.log(delete o?.p?.q, o.p);
console.log(delete o?.["p"]?.["q"], o.p);
o.p = { q: 2 };
console.log(o?.p?.q);
