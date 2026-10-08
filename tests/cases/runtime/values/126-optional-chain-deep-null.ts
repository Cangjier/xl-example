// xl:title 深链上中间一格是 null（`?.` 一路给 undefined）
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { a: { b: null } };
console.log(o?.a?.b?.c, o.a?.b?.c, o?.missing?.c);
