// xl:title `[].slice.call(类数组)`：数组方法是通用的
// xl:round 330
// xl:judge stdout
// xl:end

const like = { 0: "a", 1: "b", length: 2 };
console.log([].slice.call(like as any).join("-"));
