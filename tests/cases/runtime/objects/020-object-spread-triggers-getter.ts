// xl:title `{ ...src }` 会把 getter 取值一次（不是搬运那格描述符）
// xl:round 305
// xl:judge stdout
// xl:end

const src = { get x() { console.log("getter"); return 1; } };
const copy = { ...src };
console.log(copy.x);
