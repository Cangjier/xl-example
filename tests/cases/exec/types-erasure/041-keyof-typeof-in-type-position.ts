// xl:title 类型位上的 keyof / typeof / 索引访问不产生运行期读取
// xl:round 371
// xl:judge stdout
// xl:end
const config = { host: "h", port: 1 };
type Keys = keyof typeof config;
type Host = (typeof config)["host"];
function get(k: Keys): unknown { return config[k]; }
const k: Keys = "host";
console.log(get(k), get("port"), typeof (null as unknown as Host));
console.log(Object.keys(config).join(","));
