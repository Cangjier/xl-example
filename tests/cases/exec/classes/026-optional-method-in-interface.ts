// xl:title 接口里的可选方法与值侧的可选调用
// xl:round 304
// xl:judge stdout
// xl:end

interface Logger { log?(msg: string): void; name: string }
const quiet: Logger = { name: "quiet" };
const loud: Logger = { name: "loud", log: (m) => console.log("LOG", m) };
quiet.log?.("a");
loud.log?.("b");
console.log(quiet.name, loud.name);
