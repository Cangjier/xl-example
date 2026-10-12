// xl:title 类数组对象：`length` + 下标 + `Array.from`
// xl:round 330
// xl:judge stdout
// xl:end

const like = { 0: "a", 1: "b", length: 2 };
console.log(like[0], like.length, Array.from(like as any).join(","));
