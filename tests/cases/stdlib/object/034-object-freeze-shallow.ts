// xl:title Object.freeze 是浅的：内层照样能改
// xl:judge stdout
// xl:end

const o = Object.freeze({ a: { b: 1 } });
o.a.b = 2;
console.log(o.a.b, Object.isFrozen(o), Object.isFrozen(o.a));
