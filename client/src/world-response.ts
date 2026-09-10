/** A delayed response cannot restore a story that another tab has replaced. */
export function belongsToCurrentWorld(origin: string, current: { id: string } | undefined, returned: { id: string }): boolean {
  return current?.id === origin && returned.id === origin;
}
