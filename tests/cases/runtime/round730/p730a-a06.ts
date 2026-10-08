// xl:title 类那一档没被带偏（`extends` 那两个父类的名字与 toString）
// xl:round 730
// xl:judge stdout
// xl:end
class Base extends Error {}
console.log((class extends Array {}).toString());
console.log(Base.name, (new Base()).constructor.name);
console.log((class Named { static who() { return this.name; } }).who());
