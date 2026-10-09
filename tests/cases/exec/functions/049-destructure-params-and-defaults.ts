// xl:title 解构形参 + 默认值 + 重命名
// xl:round 331
// xl:judge stdout
// xl:end

function render({ title = "untitled", tags = [] as string[], meta: { width = 80 } = {} } = {}): string {
  return title + "|" + tags.join(",") + "|" + width;
}
console.log(render());
console.log(render({ title: "t", tags: ["a", "b"], meta: { width: 40 } }));
