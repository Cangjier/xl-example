// xl:title Number.toString(radix) 与 parseInt 往返（精度与舍入）
// xl:judge stdout
// xl:end

const n = 1234.5678;
console.log(n.toString(36), parseInt(n.toString(36), 36), (123456789).toString(36));
console.log((1 / 3).toString(16).length > 0, (2 ** 53).toString(16), (0.1 + 0.2).toString());
