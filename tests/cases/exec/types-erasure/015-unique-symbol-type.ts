// xl:title unique symbol 与计算属性名
// xl:judge stdout
// xl:end

const key: unique symbol = Symbol("k");
const o = { [key]: 1 };
console.log(o[key], typeof key);
