// xl:title 解构默认值只认 undefined
// xl:round 692
// xl:judge stdout
// xl:end

const { a = 1, b = 2 } = { a: null, b: undefined };
console.log(a, b);
