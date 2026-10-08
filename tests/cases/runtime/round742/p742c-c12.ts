// xl:title 无头 `for (;;)` 与带标签的双层 `break`
// xl:round 742
// xl:judge stdout
// xl:end
let n = 0;
outer: for (;;) {
  for (let j = 0; j < 3; j++) {
    n++;
    if (n === 4) break outer;
  }
}
console.log(n);
