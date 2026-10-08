// xl:title 可选链与空值合并的几种位置
// xl:round 291
// xl:judge stdout
// xl:end

const o: any = { a: { b: null } };
console.log(o?.a?.b ?? "d", o?.z?.y ?? "d2", o.a?.["b"] ?? "d3");
console.log(o?.a?.b?.c, o.missing?.());
