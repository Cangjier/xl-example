// xl:title 只有 finally 的 try（没有 catch）
// xl:judge stdout
// xl:end

function f(): number {
  let n = 0;
  try { n = 1; } finally { n += 10; }
  return n;
}
function g(): string {
  try { return "early"; } finally { console.log("g finally"); }
}
console.log(f(), g());
