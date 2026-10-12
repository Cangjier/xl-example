// xl:title 排序比较器读访问器的次数与顺序
// xl:round 7
// xl:judge stdout
// xl:end

let reads = 0;
const items = [
  { get v() { reads++; return 3; }, n: "a" },
  { get v() { reads++; return 1; }, n: "b" },
  { get v() { reads++; return 2; }, n: "c" },
];
const order = items.slice().sort((x, y) => x.v - y.v).map((o) => o.n);
console.log(order.join(","));
console.log("sorted", items.length);
