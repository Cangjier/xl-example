// xl:title async 体里抛：承诺被拒绝、调用处接得住
// xl:round 304
// xl:judge stdout
// xl:end

async function boom() {
  throw new Error("async-boom");
}
boom().catch((e) => console.log("caught", e.message));
async function viaAwait() {
  try {
    await boom();
  } catch (e: any) {
    return "handled:" + e.message;
  }
}
viaAwait().then((v) => console.log(v));
