// xl:title as const 与 readonly 数组
// xl:round 291
// xl:judge stdout
// xl:end

const t = [1, "a"] as const;
const ro: readonly number[] = [1, 2];
console.log(t[0], t[1], ro.length, ro[0]);
