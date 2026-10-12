// xl:title 嵌套解构 + 改名 + 默认值一起
// xl:round 304
// xl:judge stdout
// xl:end

const src = { user: { name: "kim", tags: ["a", "b"] }, extra: null };
const { user: { name: who, tags: [first, second = "z"] }, extra = "none" } = src as any;
console.log(who, first, second, extra);
