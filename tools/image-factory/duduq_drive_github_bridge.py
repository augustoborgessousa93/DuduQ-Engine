#!/usr/bin/env python3
"""DUDUQ: receive an authorized Google Drive ZIP and publish to a QA-only GitHub branch.

Does not open chatgpt.com, use Selenium, run Git Bash, generate images, or deploy production.
Defaults to read-only validation; --apply explicitly enables the review-branch upload.
"""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import struct
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

OWNER_REPO = 'augustoborgessousa93/DuduQ-Engine'
BRANCH = 'automation/duduq-media-source-only-fix-20261029'
TARGET = 'qa/media-inbox/chatgpt-batch-10-20261029/DUDUQ_ChatGPT_Lote_Escolar_10_20261029.zip'
EXPECTED_SHA = '0a3d71d2b7ee127d702326d437dc13b8145ab58d1333b15819ebe8cb3b5ba280'
DRIVE_FILE_ID = '1DzXdNUpJkCrXGJCiqDscZmc2hjZPCCMh'


def stop(message):
    raise SystemExit('DUDUQ_BRIDGE_BLOCKED: ' + message)


def drive_download(file_id):
    """Use an existing, authorized Google ADC credential. Never scrape browser sessions."""
    try:
        import google.auth
        from google.auth.transport.requests import AuthorizedSession
    except ImportError:
        stop('GOOGLE_AUTH_LIBRARY_NOT_INSTALLED: use an authorized local Drive sync or installed official connector')
    try:
        credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/drive.readonly'])
    except Exception:
        stop('GOOGLE_DRIVE_ADC_UNAVAILABLE: use official Drive connector to save the ZIP locally first')
    session = AuthorizedSession(credentials)
    url = 'https://www.googleapis.com/drive/v3/files/' + urllib.parse.quote(file_id, safe='') + '?alt=media'
    resp = session.get(url, timeout=60, stream=True)
    if resp.status_code != 200:
        stop('DRIVE_DOWNLOAD_HTTP_' + str(resp.status_code))
    data = bytearray()
    for chunk in resp.iter_content(1024 * 1024):
        data.extend(chunk)
        if len(data) > 30_000_000:
            stop('DRIVE_ZIP_EXCEEDS_30MB')
    return bytes(data)


def inspect_archive(blob, sha):
    if len(blob) > 30_000_000 or len(blob) < 100_000:
        stop('ZIP_SIZE_UNEXPECTED')
    actual = hashlib.sha256(blob).hexdigest()
    if actual != sha:
        stop('ZIP_SHA256_MISMATCH: expected ' + sha + ' found ' + actual)
    try:
        archive = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile:
        stop('INVALID_ZIP')
    with archive:
        members = archive.infolist()
        if len(members) > 25 or sum(x.file_size for x in members) > 60_000_000:
            stop('ZIP_BOMB_OR_TOO_MANY_MEMBERS')
        seen = set()
        for m in members:
            p = PurePosixPath(m.filename)
            if (p.is_absolute() or '..' in p.parts or '\\' in m.filename or
                    m.filename in seen or m.file_size > 12_000_000 or
                    (m.external_attr >> 16) & 0o170000 == 0o120000):
                stop('UNSAFE_ZIP_MEMBER: ' + m.filename)
            seen.add(m.filename)
        manifest = json.loads(archive.read('batch-manifest.json').decode('utf-8'))
        assets = manifest.get('assets', [])
        if manifest.get('schemaVersion') != 'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1':
            stop('UNEXPECTED_BATCH_SCHEMA')
        if len(assets) != 10:
            stop('BATCH_LIMIT_EXPECTED_TEN: ' + str(len(assets)))
        count = 0
        for asset in assets:
            name = asset.get('file', '')
            if not name.startswith('images/') or name not in seen:
                stop('MISSING_ASSET: ' + str(name))
            raw = archive.read(name)
            if hashlib.sha256(raw).hexdigest() != asset.get('sha256'):
                stop('ASSET_SHA256_MISMATCH: ' + name)
            if raw[:8] != b'\x89PNG\r\n\x1a\n' or raw[12:16] != b'IHDR':
                stop('INVALID_PNG: ' + name)
            width, height, depth, color = struct.unpack('>IIBB', raw[16:26])
            if (width, height, depth, color) != (1254, 1254, 8, 6):
                stop('NOT_NATIVE_RGBA_1254: ' + name)
            count += len(asset.get('bindings', []))
        if count != 12:
            stop('EXPECTED_12_EXACT_BINDINGS: ' + str(count))
    return {'sha256': actual, 'bytes': len(blob), 'assets': len(assets), 'bindings': count}


def github_api(method, endpoint, token, obj=None):
    url = 'https://api.github.com/repos/' + OWNER_REPO + endpoint
    payload = None if obj is None else json.dumps(obj, separators=(',', ':')).encode('utf-8')
    headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
               'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'DUDUQ-Drive-Bridge/1.0'}
    if payload is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, payload, headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        stop('GITHUB_HTTP_' + str(exc.code) + ' ' + endpoint)


def authorized_github_token():
    """Prefer injected credentials; optionally reuse the official gh CLI login.

    Never read browser cookies, print the credential, or invoke a shell.
    """
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if token:
        return token.strip()
    try:
        result = subprocess.run(['gh', 'auth', 'token'], capture_output=True,
                                text=True, timeout=15, check=False, shell=False)
    except (FileNotFoundError, PermissionError, subprocess.TimeoutExpired):
        return None
    return result.stdout.strip() if result.returncode == 0 else None


def publish_candidate_zip(blob, token):
    ref = '/git/ref/' + urllib.parse.quote('heads/' + BRANCH, safe='/')
    head = github_api('GET', ref, token)['object']['sha']
    commit = github_api('GET', '/git/commits/' + head, token)
    # Blob SHA is Git's raw-content hash. An existing different ZIP must never be replaced.
    expected_blob_sha = hashlib.sha1(b'blob ' + str(len(blob)).encode() + b'\x00' + blob).hexdigest()
    existing_url = '/contents/' + TARGET + '?ref=' + urllib.parse.quote(BRANCH, safe='')
    try:
        existing = github_api('GET', existing_url, token)
        if existing.get('sha') == expected_blob_sha:
            return {'status': 'ALREADY_PRESENT', 'commit': head, 'target': TARGET}
        stop('EXISTING_DIFFERENT_ZIP_WILL_NOT_BE_OVERWRITTEN')
    except SystemExit as e:
        if 'GITHUB_HTTP_404' not in str(e):
            raise
    blob_created = github_api('POST', '/git/blobs', token,
                              {'content': base64.b64encode(blob).decode('ascii'), 'encoding': 'base64'})['sha']
    if blob_created != expected_blob_sha:
        stop('GITHUB_BLOB_SHA_MISMATCH')
    tree = github_api('POST', '/git/trees', token, {'base_tree': commit['tree']['sha'],
        'tree': [{'path': TARGET, 'mode': '100644', 'type': 'blob', 'sha': blob_created}]})['sha']
    new_commit = github_api('POST', '/git/commits', token,
        {'message': 'media(chatgpt): receive 10 original PNGs ZIP for isolated QA',
         'tree': tree, 'parents': [head]})['sha']
    github_api('PATCH', '/git/refs/' + urllib.parse.quote('heads/' + BRANCH, safe='/'), token,
               {'sha': new_commit, 'force': False})
    return {'status': 'UPLOADED_TO_QA_BRANCH', 'commit': new_commit, 'target': TARGET,
            'actions': 'triggered by ZIP push; no production deploy'}


def main():
    p = argparse.ArgumentParser(description='DUDUQ native ChatGPT ZIP: Google Drive to GitHub QA branch')
    s = p.add_mutually_exclusive_group(required=True)
    s.add_argument('--source', type=Path, help='authorized local Drive download/synchronized file')
    s.add_argument('--drive-id', help='Google Drive file ID, downloaded using official Google ADC')
    p.add_argument('--sha256', default=EXPECTED_SHA)
    p.add_argument('--apply', action='store_true', help='upload to review branch; default is dry-run')
    args = p.parse_args()
    if args.source:
        if not args.source.is_file():
            stop('SOURCE_FILE_MISSING: ' + str(args.source))
        blob = args.source.read_bytes()
    else:
        blob = drive_download(args.drive_id)
    info = inspect_archive(blob, args.sha256)
    if args.apply:
        token = authorized_github_token()
        if not token:
            stop('GITHUB_TOKEN_NOT_AVAILABLE: use authorized GitHub connector/credential on Linux or Codex')
        info.update(publish_candidate_zip(blob, token))
    else:
        info['status'] = 'DRY_RUN_PASS_NO_GITHUB_WRITES'
    print(json.dumps(info, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()