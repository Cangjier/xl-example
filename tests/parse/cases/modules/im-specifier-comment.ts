// xl:expect Import,AreaAnnotation
// xl:note 具名导入的 `as` 两侧夹块注释（照原文扫会把注释算进 propertyName）
import { a /* 左 */ as /* 右 */ b, c } from "m"
