// xl:title 嵌套 try 的 finally 次序：内层先、外层后
// xl:judge stdout
// xl:end

function f(): string {
  try {
    try { throw new Error("inner"); } finally { console.log("inner finally"); }
  } catch (e) {
    console.log("caught", (e as Error).message);
  } finally {
    console.log("outer finally");
  }
  return "done";
}
console.log(f());
