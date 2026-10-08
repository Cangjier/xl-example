// xl:title 嵌套一元与调用链的接线（`typeof o[k]().v` 那一族的展开）
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { k: () => ({ v: 1 }) };
const k = "k";
console.log(typeof o[k]().v, -o[k]().v, !o[k]().v);
console.log(typeof o["k"]().v, typeof o.k().v);
