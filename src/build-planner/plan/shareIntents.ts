export function buildXShareIntentUrl(text: string): string {
  const params = new URLSearchParams({ text });
  return `https://x.com/intent/post?${params.toString()}`;
}

export function buildLineShareIntentUrl(text: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}
