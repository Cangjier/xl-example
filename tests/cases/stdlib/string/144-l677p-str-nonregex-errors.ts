// xl:title 点名：repeat 的非法次数、normalize 的非法形式要走 RangeError
// xl:judge stdout
// xl:end

for (const call of [() => "a".repeat(-1), () => "a".repeat(2.5), () => "a".normalize("XX")]) {
  try {
    call();
    console.log("no throw");
  } catch (e) {
    console.log(e instanceof RangeError, e.constructor.name);
  }
}
console.log("a".repeat(2.0));
