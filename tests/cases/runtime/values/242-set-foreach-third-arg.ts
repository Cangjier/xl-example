// xl:title Set.forEach 的第三个实参就是那个集合本身
// xl:round 7
// xl:judge stdout
// xl:end

const s = new Set<number>([1, 2, 3]);
const out: string[] = [];
s.forEach(function (value, key, owner) {
  out.push(value + "/" + key + "/" + (owner === s));
});
console.log(out.join(" "));
