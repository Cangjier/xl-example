// xl:title finally 里的 return 覆盖 try 的返回值
// xl:round 8
// xl:judge stdout
// xl:end

function f() {
  try { return "try"; } finally { return "finally"; }
}
function g() {
  try { return "try"; } finally { console.log("g-finally"); }
}
console.log(f(), g());
