// xl:title 降级层：可选调用接在成员链后面
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { a: { m() { return 5; } } };
console.log(o.a.m?.(), o.a?.m?.());
