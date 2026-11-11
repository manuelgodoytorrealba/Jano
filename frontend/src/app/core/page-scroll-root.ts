export function pageScrollRoot(document: Document): HTMLElement {
  const content = document.querySelector<HTMLElement>('.app-shell__content');
  if (
    content &&
    /auto|scroll/.test(document.defaultView?.getComputedStyle(content).overflowY ?? '')
  ) {
    return content;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}
