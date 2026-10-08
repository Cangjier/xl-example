// xl:title `finally` 里的 `return` 覆盖 `try` 里的
// xl:round 742
// xl:judge stdout
// xl:end
function f(): string {
  try { return "try"; } finally { return "finally"; }
}
console.log(f());
