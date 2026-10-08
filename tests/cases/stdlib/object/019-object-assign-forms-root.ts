// xl:title Object.assign 的多个来源与返回值身份
// xl:judge stdout
// xl:end

const t: any = { a: 1 };
const r = Object.assign(t, { b: 2 }, { a: 9, c: 3 });
console.log(JSON.stringify(t), r === t, Object.keys(t).join(","));
console.log(JSON.stringify(Object.assign({}, null as any, undefined as any, { d: 4 })));
