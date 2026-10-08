// xl:title catch 的形参可以解构（`catch ({ message, code })`）
// xl:round 305
// xl:judge stdout
// xl:end

try {
  throw { message: "m", code: 7 };
} catch ({ message, code }: any) {
  console.log("caught", message, code);
}
