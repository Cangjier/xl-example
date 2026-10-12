// xl:title 可选调用 f?.() 与可选链上的 this
// xl:round 623
// xl:judge stdout
// xl:end

const o: any = { v: 1, m() { return this.v; } };
console.log(o.m?.(), o.z?.());
console.log(o?.m?.(), o?.z?.());
const f: any = undefined;
console.log(f?.());
