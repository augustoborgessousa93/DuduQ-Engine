import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {officialCrlfTextBytes} from '../official-text-asset-bytes.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('official text bytes are CRLF-stable and idempotent', () => {
  const expected = Buffer.from('alpha\r\nbeta\r\n', 'utf8');
  assert.deepEqual(officialCrlfTextBytes(Buffer.from('alpha\nbeta\n')), expected);
  assert.deepEqual(officialCrlfTextBytes(Buffer.from('alpha\rbeta\r')), expected);
  assert.deepEqual(officialCrlfTextBytes(expected), expected);
});

test('V23 and V24 official overlay asset hashes do not depend on checkout EOL', async () => {
  const pins = new Map([
    ['qa/overlays/v23/core/duduq-ebc-attribution-watermark.js', 'c0ef511ecbcb52f01f89827ee70e34402cd725340c8dabdd58a443bae67939c3'],
    ['qa/overlays/v24/core/duduq-header-title-fit-v24.js', '7ca07aa9e643d2c45e38160dc58c56d5253a85251afec9124cf06bb9c36658c4']
  ]);

  for (const [path, expectedSha256] of pins) {
    const checkedOut = await readFile(path);
    const lf = Buffer.from(checkedOut.toString('utf8').replace(/\r\n|\r/g, '\n'), 'utf8');
    const crlf = Buffer.from(lf.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
    assert.deepEqual(officialCrlfTextBytes(lf), officialCrlfTextBytes(crlf), path);
    assert.equal(sha256(officialCrlfTextBytes(lf)), expectedSha256, path);
  }
});
