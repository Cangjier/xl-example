// xl:title this 绑定：方法调用 / 裸调用 / call / 箭头函数取外层
// xl:round 7
// xl:judge stdout
// xl:end

const o = { n: "o", get() { return this === undefined ? "undef" : (this as any).n; } };
const bare = o.get;
console.log(o.get(), bare(), o.get.call({ n: "x" }));
const arrow = () => (this === undefined ? "top-undef" : "top");
console.log(typeof arrow());
