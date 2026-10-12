// xl:title 带标签的 continue 跨两层 for..of
// xl:round 7
// xl:judge stdout
// xl:end

const pairs: string[] = [];
outer: for (const a of [1, 2, 3]) {
  for (const b of [1, 2, 3]) {
    if (b === 2) continue outer;
    if (a === 2) break outer;
    pairs.push(a + ":" + b);
  }
}
console.log(pairs.join(" "));
