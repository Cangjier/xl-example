// xl:title 带标签的 continue
// xl:round 692
// xl:judge stdout
// xl:end

const out = [];
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    out.push(i + "" + j);
  }
}
console.log(out.join(","));
