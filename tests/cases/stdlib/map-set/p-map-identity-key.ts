// xl:title 对象键按身份
// xl:round 692
// xl:judge stdout
// xl:end

const m = new Map();
const a = {};
const b = {};
m.set(a, 1);
console.log(m.get(a), m.get(b), m.size);
