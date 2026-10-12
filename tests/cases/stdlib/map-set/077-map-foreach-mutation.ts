// xl:title Map.forEach 期间增删键的可见性
// xl:round 647
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2]]);
const seen = [];
m.forEach((v, k) => {
  seen.push(k + ":" + v);
  if (k === "a") { m.delete("b"); m.set("c", 3); }
});
console.log(seen.join(","), m.size);
