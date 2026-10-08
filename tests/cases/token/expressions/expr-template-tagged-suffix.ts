// xl:note 标签模板后面跟着后缀：`tag`abc`.length`（第 176 轮 · 投影 0c 支）
// xl:expect String,PropertyAccess,Method
const a = tag`abc`.length;
const b = tag`a${x}b`[0];
const c = obj.tag`abc`.trim();
const d = (cond ? one : two)`abc`.length;
