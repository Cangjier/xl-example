// xl:title `as` 出现在条件与逻辑表达式里
// xl:round 304
// xl:judge stdout
// xl:end

const raw: unknown = "5";
if ((raw as string).length > 0) console.log("nonempty", (raw as string).toUpperCase());
const n = Number(raw as string);
console.log(n, (n as number) > 1 && (raw as string).startsWith("5"));
