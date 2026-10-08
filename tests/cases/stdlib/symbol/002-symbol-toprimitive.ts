// xl:title Symbol.toPrimitive：参与算术与字符串化
// xl:judge stdout
// xl:end

const o: any = { [Symbol.toPrimitive](hint: string) { return hint === "number" ? 7 : "S"; } };
console.log(o + 1, "" + o, o * 2);
