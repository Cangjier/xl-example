// xl:title await 落在 try/finally 里：收尾次序
// xl:round 304
// xl:judge stdout
// xl:end

async function run() {
  try {
    console.log("try", await Promise.resolve("a"));
    return "from-try";
  } finally {
    console.log("finally", await Promise.resolve("b"));
  }
}
run().then((v) => console.log("result", v));
