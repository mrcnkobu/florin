const START = "<!-- florin:start -->";
const END = "<!-- florin:end -->";

export function replaceManagedSection(current: string, managedContent: string): string {
  const replacement = `${START}\n${managedContent.trim()}\n${END}`;
  const startIndex = current.indexOf(START);
  const endIndex = current.indexOf(END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return insertManagedSection(current, managedContent);
  }

  return `${current.slice(0, startIndex)}${replacement}${current.slice(endIndex + END.length)}`;
}

export function insertManagedSection(current: string, managedContent: string): string {
  const trimmed = current.trimEnd();
  return `${trimmed}\n\n${START}\n${managedContent.trim()}\n${END}\n`;
}
