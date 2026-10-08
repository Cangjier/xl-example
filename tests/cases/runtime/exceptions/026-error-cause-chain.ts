// xl:title 错误链：`cause` 与嵌套包裹
// xl:round 330
// xl:judge stdout
// xl:end

function inner(): never {
  throw new Error("root");
}
function outer(): never {
  try {
    inner();
  } catch (e) {
    throw new Error("wrap", { cause: e });
  }
}
try {
  outer();
} catch (e) {
  const err = e as Error & { cause?: Error };
  console.log(err.message, err.cause?.message);
}
