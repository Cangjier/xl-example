// xl:title 降级层：可选调用与二元 / 一元
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { m() { return 2; } };
console.log(o?.m() + 1, !o?.m?.());
