// xl:title 逗号运算符与 void 的求值顺序
// xl:round 7
// xl:judge stdout
// xl:end

let trace: string[] = [];
const bump = (tag: string, value: number): number => {
  trace.push(tag);
  return value;
};
const total = (bump("a", 1), bump("b", 2), bump("c", 3));
console.log(total, trace.join(""));
console.log(void bump("d", 4), trace.join(""));
