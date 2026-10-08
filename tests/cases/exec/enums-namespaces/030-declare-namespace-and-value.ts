// xl:title `declare namespace` 整块擦掉，旁边那句照跑
// xl:round 305
// xl:judge stdout
// xl:end

declare namespace D {
  const x: number;
  function f(): void;
}
console.log("declared", typeof (globalThis as any).D);
