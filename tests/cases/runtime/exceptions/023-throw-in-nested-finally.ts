// xl:title 内层 `finally` 跑完之后，外层的 `catch` 接得住那一抛
// xl:round 305
// xl:judge stdout
// xl:end

function f(): string {
  try {
    try {
      throw new Error("inner");
    } finally {
      console.log("fin");
    }
  } catch (e) {
    return (e as Error).message;
  }
}
console.log(f());
