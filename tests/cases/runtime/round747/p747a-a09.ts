// xl:title 标签：`break` / `continue` 打在嵌套循环、`try`、裸块上
// xl:round 747
// xl:judge stdout
// xl:end
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    if (i === 2) break outer;
    console.log(i, j);
  }
}
first: second: for (let i = 0; i < 3; i++) {
  if (i === 1) continue first;
  if (i === 2) break second;
  console.log("L" + i);
}
lbl: { console.log("in"); break lbl; console.log("not here"); }
tryLbl: try { console.log("t1"); break tryLbl; } finally { console.log("tf"); }
console.log("done");
