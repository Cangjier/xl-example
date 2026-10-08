// xl:title 函数的三种写法与 `this` 的取法
// xl:round 330
// xl:judge stdout
// xl:end

const obj = {
  value: 7,
  plain(): number {
    return this.value;
  },
  arrow: () => 0,
  shorthand() {
    return this.value * 2;
  },
};
console.log(obj.plain(), obj.shorthand(), typeof obj.arrow);
const f = obj.plain;
console.log(f.call(obj), f.call({ value: 3 }));
