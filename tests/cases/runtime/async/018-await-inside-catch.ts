// xl:title `catch` 体里 `await`
// xl:round 305
// xl:judge stdout
// xl:end

async function f() {
  try {
    throw new Error("x");
  } catch (e) {
    const m = await Promise.resolve((e as Error).message);
    console.log("caught", m);
  }
}
f();
