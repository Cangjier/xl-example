// xl:title 可选调用打在**函数值**上（`f?.()`）
// xl:round 741
// xl:judge stdout
// xl:end
const f: any = (x: any) => x + 1;
const g: any = null;
console.log(f?.(1), g?.(1));
console.log(f?.(1) + 1, typeof g?.());
