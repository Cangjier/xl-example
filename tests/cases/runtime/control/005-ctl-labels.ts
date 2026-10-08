// xl:title 带标签的循环：`continue outer` / `break outer`
// xl:judge stdout
// xl:end

let count = 0;
outer: for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    if (j === 2) continue outer;
    if (i === 3) break outer;
    count++;
  }
}
console.log(count);
