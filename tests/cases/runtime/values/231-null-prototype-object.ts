// xl:title 没有原型的对象：Object.create(null) 没有 toString，得靠 Object.prototype 借
// xl:round 7
// xl:judge stdout
// xl:end

const bare = Object.create(null);
console.log(Object.getPrototypeOf(bare), "toString" in bare, typeof bare.toString);
bare.k = 1;
console.log(Object.prototype.hasOwnProperty.call(bare, "k"), Object.keys(bare).join(","));
console.log(Object.prototype.toString.call(bare));
