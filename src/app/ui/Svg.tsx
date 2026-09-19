import type { CSSProperties } from 'react';

/** Arte gerada chega como marcação, então é injetada em vez de remontada como JSX. */
export function Svg({ html, className, style }: {
  html: string;
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
