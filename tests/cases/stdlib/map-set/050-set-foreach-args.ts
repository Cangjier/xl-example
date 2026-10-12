// xl:title `Set.forEach` 的三个实参
// xl:round 305
// xl:judge stdout
// xl:end

const s = new Set(["a", "b"]);
s.forEach((v, k, self) => console.log(v, k, self === s));
