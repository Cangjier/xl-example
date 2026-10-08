// xl:title 生成器 / async / 箭头各自的**自有名表**
// xl:round 730
// xl:judge stdout
// xl:end
function* g() {}
async function a() {}
console.log(Object.getOwnPropertyNames(g).join(","));
console.log(Object.getOwnPropertyNames(a).join(","));
console.log(Object.getOwnPropertyNames((() => {})).join(","));
