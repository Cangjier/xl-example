// xl:title console.log(一个错误对象)：栈里带宿主的内部帧
// xl:judge stdout
// xl:want differ
// xl:why `console.log(new Error("boom"))` 的栈没有渲染：本仓只给 `Error: boom` 一行，`node` 还打调用帧。**要做**——钉的是**当前 Node 的**形状（用户口径：跟最新版），帧里的宿主路径与内部行号不参与判定
// xl:end

console.log(new Error("boom"));
