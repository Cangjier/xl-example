// xl:title for..of 套 for..of：continue 跳到外层那一个
// xl:judge stdout
// xl:end

const out: string[] = [];
outer: for (const a of [1, 2]) {
  for (const b of [1, 2]) {
    if (b === 2) continue outer;
    out.push(a + "-" + b);
  }
}
console.log(out.join(","));
