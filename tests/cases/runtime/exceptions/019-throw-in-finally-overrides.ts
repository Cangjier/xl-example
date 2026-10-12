// xl:title finally 里再抛：盖掉原来的返回值
// xl:judge stdout
// xl:end

function f(): string {
  try {
    return "try";
  } finally {
    throw new Error("from-finally");
  }
}
try {
  console.log(f());
} catch (e) {
  console.log("caught", (e as Error).message);
}
