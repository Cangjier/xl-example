// xl:title 稀疏数组的洞：length 算、forEach / map 跳过
// xl:judge stdout
// xl:end

const xs: any[] = [1, , 3];
console.log(xs.length, xs[1], 1 in xs, 2 in xs);
let seen = "";
xs.forEach((v, i) => { seen += i + ":" + v + " "; });
console.log(seen.trim());
console.log(xs.map((v) => v).length, xs.filter(() => true).length);
