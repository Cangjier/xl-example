// xl:title `Promise.try`：同步抛出的错变成拒绝
// xl:round 330
// xl:judge stdout
// xl:end

function boom(): number {
  throw new Error("nope");
}
Promise.try(boom).catch((e) => console.log("caught", (e as Error).message));
Promise.try(() => "ok").then((v) => console.log("then", v));
