// xl:title 对象字面量：简写方法、简写属性、计算键
// xl:judge stdout
// xl:end

const name = "world";
const key = "dyn";
const o = {
  name,
  greet() { return "hi " + this.name; },
  [key + "1"]: 7,
  "quoted key": true,
  nested: { deep: { value: 1 } },
};
console.log(o.greet(), o.dyn1, o["quoted key"], o.nested.deep.value);
