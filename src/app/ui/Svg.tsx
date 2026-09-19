import type { CSSProperties } from 'react';

/** Generated art arrives as markup, so it is injected rather than rebuilt as JSX. */
export function Svg({ html, className, style }: {
  html: string;
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
