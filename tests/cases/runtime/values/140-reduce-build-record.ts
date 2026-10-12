// xl:title `reduce` 拿一个对象当累加器（词频那一类）
// xl:round 305
// xl:judge stdout
// xl:end

const xs = ["a", "b", "a"];
const counts = xs.reduce<Record<string, number>>((acc, x) => {
  acc[x] = (acc[x] || 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify(counts));
