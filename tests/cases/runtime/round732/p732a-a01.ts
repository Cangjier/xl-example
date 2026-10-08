// xl:title 计算键方法的 `name`（字面量键当场知道、动态键运行期补）
// xl:round 732
// xl:judge stdout
// xl:end
const o = { ["c"]() {}, [5]() {}, ["k" + 1]() {} };
console.log(o.c.name, o[5].name, o.k1.name);
console.log(o["c"], o[5]);
