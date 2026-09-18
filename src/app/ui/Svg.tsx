/** Generated art arrives as markup, so it is injected rather than reconstructed as JSX. */
export function Svg({ markup, className }: { markup: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}
