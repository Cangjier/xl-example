// xl:title 条件类型里的 infer
// xl:judge stdout
// xl:end

type El<T> = T extends (infer U)[] ? U : never;
const x: El<number[]> = 3;
const y: El<string> = "z" as never;
console.log(x, typeof y);
