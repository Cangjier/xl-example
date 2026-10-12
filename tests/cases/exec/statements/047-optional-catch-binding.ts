// xl:title 可选 catch 绑定：不接那个异常对象
// xl:round 676
// xl:judge stdout
// xl:end

try {
  throw new Error("x");
} catch {
  console.log("caught without binding");
}
console.log("after");
