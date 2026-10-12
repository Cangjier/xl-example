// xl:title 循环里的 `try/finally`：`break` 之后 finally 照跑
// xl:round 305
// xl:judge stdout
// xl:end

for (let i = 0; i < 3; i++) {
  try {
    if (i === 1) break;
    console.log("body", i);
  } finally {
    console.log("fin", i);
  }
}
console.log("after");
