// xl:title `for...of` 提前 `break` 会调生成器的 `return()`
// xl:round 691
// xl:judge stdout
// xl:end
function* gen(): any {
  try {
    yield 1;
    yield 2;
    yield 3;
  } finally {
    console.log("cleanup");
  }
}
for (const v of gen()) {
  console.log("v", v);
  if (v === 2) break;
}
