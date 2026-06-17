declare module "react-cytoscapejs" {
  import type { ComponentType } from "react";
  import type { Core, ElementDefinition } from "cytoscape";

  export interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    // permissive — cytoscape's own option types are stricter than we need here
    style?: React.CSSProperties;
    className?: string;
    layout?: Record<string, unknown>;
    stylesheet?: unknown;
    cy?: (cy: Core) => void;
    minZoom?: number;
    maxZoom?: number;
    wheelSensitivity?: number;
    [key: string]: unknown;
  }

  const CytoscapeComponent: ComponentType<CytoscapeComponentProps> & {
    normalizeElements: (data: unknown) => ElementDefinition[];
  };
  export default CytoscapeComponent;
}
