// xl:title 对象字面量访问器与 super 成员访问
// xl:round 9
// xl:judge stdout
// xl:end

const base = { greet() { return "base"; } };
const obj = {
  __proto__: base,
  greet() { return "derived+" + super.greet(); },
};
console.log(obj.greet());
const withAccessor = {
  _v: 1,
  get v() { return this._v * 10; },
  set v(x: number) { this._v = x; },
};
withAccessor.v = 3;
console.log(withAccessor.v, Object.keys(withAccessor).join(","));
