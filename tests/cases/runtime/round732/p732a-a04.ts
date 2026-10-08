// xl:title 计算键属性赋的值那份函数（箭头 / 函数表达式那两档）
// xl:round 732
// xl:judge stdout
// xl:end
const o = { ["c"]: () => 1, [5]: function () { return 2; }, ["k" + 1]: () => 3 };
console.log(o.c.name, o[5].name, o.k1.name);
