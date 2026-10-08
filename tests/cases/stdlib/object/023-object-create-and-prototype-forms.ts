// xl:title Object.create：null 原型 / 带属性 / 继承来的键
// xl:judge stdout
// xl:end

const bare = Object.create(null);
bare.x = 1;
console.log(bare.x, Object.getPrototypeOf(bare));
const base = { greet() { return "hi"; } };
const child = Object.create(base, { own: { value: 5, enumerable: true } });
console.log(child.greet(), child.own, Object.keys(child).join(","), "greet" in child);
