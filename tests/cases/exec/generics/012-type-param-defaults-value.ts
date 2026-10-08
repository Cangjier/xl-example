// xl:title 类型形参带默认值：运行期一个痕迹都没有
// xl:round 304
// xl:judge stdout
// xl:end

interface Box<T = string> { value: T }
function wrap<T = number>(v: T): Box<T> { return { value: v }; }
console.log(wrap(1).value, wrap<boolean>(true).value);
const b: Box = { value: "s" };
console.log(b.value);
