// xl:title for..of 提前 break：生成器里的 finally 照跑
// xl:round 304
// xl:judge stdout
// xl:end

function* gen() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("cleanup");
  }
}
for (const v of gen()) {
  console.log("got", v);
  break;
}
