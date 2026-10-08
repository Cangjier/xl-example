// xl:title `reduceRight` 与 `entries` / `keys` / `values` 的形状
// xl:round 691
// xl:judge stdout
// xl:end
console.log(["a", "b", "c"].reduceRight((acc: any, v: any) => acc + v, ""));
console.log(JSON.stringify([...["a", "b"].entries()]));
console.log(JSON.stringify([...["a", "b"].keys()]));
console.log(JSON.stringify([...["a", "b"].values()]));
