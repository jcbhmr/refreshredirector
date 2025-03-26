export function parseRefresh(
  refresh: string,
  baseURL: string | URL,
): { delay: number; url: string | null } {
  const parts = refresh.split(/;|,/g, 2);

  const part1 = parts[0].trim();
  const timeInt = Number.parseInt(part1, 10);
  if (!Number.isInteger(timeInt)) {
    throw new DOMException(
      `Could not parse '${part1}' as an integer`,
      "SyntaxError",
    );
  }
  if (timeInt < 0) {
    throw new DOMException(
      `Delay must be a positive integer. Got ${timeInt}`,
      "RangeError",
    );
  }
  const delay = timeInt;

  let url: string | null = null;
  if (parts.length >= 2) {
    const part2 = parts[1].trim();
    const part2Subparts = part2.split("=", 2);
    if (part2Subparts.length < 2) {
      throw new DOMException(`No '=' found in '${part2}'`, "SyntaxError");
    }

    const part2a = part2Subparts[0].trim();
    if (part2a.toUpperCase() !== "URL") {
      throw new DOMException(
        `'${part2}' does not start with 'URL='`,
        "SyntaxError",
      );
    }

    const part2b = part2Subparts[1].trim().replace(/^(["'])(.*)\1$/, "$2");

    const urlObject = URL.parse(part2b, baseURL);
    if (!urlObject) {
      throw new DOMException(
        `Could not parse '${part2b}' as a URL`,
        "SyntaxError",
      );
    }
    url = urlObject.toString();
  }

  return { delay, url };
}
