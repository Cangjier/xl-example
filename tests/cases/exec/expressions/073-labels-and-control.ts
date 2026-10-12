// xl:title 标签 + break / continue 在嵌套循环与块上
// xl:round 371
// xl:judge stdout
// xl:end
const out: string[] = [];
outer: for (let i = 0; i < 3; i++) {
  inner: for (let j = 0; j < 3; j++) {
    if (j === 1) continue inner;
    if (i === 2) break outer;
    out.push(i + "" + j);
  }
}
block: { out.push("b"); if (out.length > 0) break block; out.push("never"); }
switch (2) { case 1: out.push("one"); case 2: out.push("two"); case 3: out.push("three"); break; default: out.push("d"); }
console.log(out.join(","));
