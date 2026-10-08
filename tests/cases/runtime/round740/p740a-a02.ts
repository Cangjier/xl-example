// xl:title 一元前缀打在**调用**上
// xl:round 740
// xl:judge stdout
// xl:end
const f = () => ({ v: 1 });
console.log(typeof f(), void f(), !f().v, -f().v);
const g = () => 3;
console.log(typeof g, typeof g(), -g());
