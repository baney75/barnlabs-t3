// functions/declarations.d.ts
declare module "__STATIC_CONTENT_MANIFEST" {
  const value: string;
  export default value;
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
        "environment-image"?: string;
        exposure?: string | number;
        style?: React.CSSProperties;
      };
    }
  }
}
