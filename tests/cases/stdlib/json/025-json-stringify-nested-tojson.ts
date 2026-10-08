// xl:title 嵌套的 `toJSON` 一层层都问
// xl:round 305
// xl:judge stdout
// xl:end

const o = {
  a: { toJSON: () => "A" },
  b: [{ toJSON: () => "B" }],
};
console.log(JSON.stringify(o));
