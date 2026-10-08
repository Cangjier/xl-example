// xl:title Array.push / pop：返回长度与弹出的值
// xl:judge stdout
// xl:end

const xs = [1, 2];
console.log(xs.push(3, 4), xs.join(","));
console.log(xs.pop(), xs.join(","), [].pop());
