# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { ComputePossibleShapesStates } from "./compute-possible-shapes-states.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { TokenIndex } from "./token-index.xl.md"
```

# namespace cangjie

# interface IComputePossibleShapes

## property CatalogGuide:CatalogGuide | null

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

## method ComputePossibleShapesByIndex:(index:TokenIndex, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates
