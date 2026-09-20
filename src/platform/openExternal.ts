/** 新規ブラウザタブでURLを開く。 */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
