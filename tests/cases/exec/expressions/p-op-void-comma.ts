// xl:title void 与逗号
// xl:round 692
// xl:judge stdout
// xl:end

let n = 0;
const v = void (n = 5);
console.log(v, n, (1, 2, 3));
