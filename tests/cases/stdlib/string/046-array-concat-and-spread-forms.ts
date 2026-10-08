// xl:title concat 的展平一层与 spread 的对照
// xl:round 291
// xl:judge stdout
// xl:end

const a = [1, 2];
console.log(a.concat([3, 4], 5).join(","));
console.log([...a, ...[3]].join(","));
console.log(a.concat([[6]]).length, a.length);
