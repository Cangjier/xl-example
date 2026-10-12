// xl:title JSON 往返：文本与解析回来的结构
// xl:round 291
// xl:judge stdout
// xl:end

const data = { list: [1, 2, 3], nested: { flag: true } };
const text = JSON.stringify(data);
console.log(text, JSON.parse(text).list.length);
