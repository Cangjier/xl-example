// xl:title 非 ASCII 标识符与字符串里的非 ASCII
// xl:judge stdout
// xl:end

const 名字 = "中文";
const π = 3.14;
function 加法(a: number, b: number): number { return a + b; }
console.log(名字, π, 加法(1, 2), "emoji:\u{1F600}".length);
