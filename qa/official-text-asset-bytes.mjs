export function officialCrlfTextBytes(bytes) {
  const text = Buffer.from(bytes).toString('utf8');
  return Buffer.from(text.replace(/\r\n|\r|\n/g, '\r\n'), 'utf8');
}
