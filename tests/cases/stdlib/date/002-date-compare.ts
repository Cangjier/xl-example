// xl:title Date 的比较：靠 ToPrimitive
// xl:judge stdout
// xl:end

const a = new Date(1000);
const b = new Date(2000);
console.log(a < b, a > b, a <= b, b - a, a == a);
