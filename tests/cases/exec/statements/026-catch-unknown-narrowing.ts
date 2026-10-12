// xl:title `catch (e: unknown)` 加 `instanceof` 收窄
// xl:round 305
// xl:judge stdout
// xl:end

try {
  throw new Error("x");
} catch (e: unknown) {
  if (e instanceof Error) console.log("msg", e.message);
  else console.log("other");
}
