export function enterAlternateScreen(stream: NodeJS.WriteStream = process.stdout): void {
  if (stream.isTTY) {
    stream.write("\x1b[?1049h\x1b[H\x1b[?25l");
  }
}

export function exitAlternateScreen(stream: NodeJS.WriteStream = process.stdout): void {
  if (stream.isTTY) {
    stream.write("\x1b[?25h\x1b[?1049l");
  }
}
