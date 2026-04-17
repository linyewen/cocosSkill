"""Cocos Creator 3.8 的 UUID 压缩算法

用法:
    python uuid_compress.py <完整 UUID>
    python uuid_compress.py 9c93288c-0032-4821-875c-f21951dbcde4
    # → 9c932iMADJIIYdc8hlR283k

或作为模块:
    from uuid_compress import compress_uuid
    compress_uuid('9c93288c-0032-4821-875c-f21951dbcde4')
"""
import sys

BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def compress_uuid(uuid: str) -> str:
    """完整 UUID (36 字符带 -) → 压缩 UUID (23 字符)

    算法：前 5 hex 原样保留，剩 27 hex 每 3 个一组转 2 base64 char。
    """
    u = uuid.replace('-', '')
    if len(u) != 32:
        raise ValueError(f'expected 32 hex chars, got {len(u)}: {uuid}')
    result = u[:5]
    rest = u[5:]
    for i in range(0, len(rest), 3):
        chunk = int(rest[i:i+3], 16)
        result += BASE64_CHARS[(chunk >> 6) & 63]
        result += BASE64_CHARS[chunk & 63]
    return result


def read_meta_uuid(meta_path: str) -> str:
    """读 .meta 文件的 uuid"""
    import json
    with open(meta_path, 'r', encoding='utf-8') as f:
        return json.load(f)['uuid']


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    arg = sys.argv[1]
    if arg.endswith('.meta'):
        uuid = read_meta_uuid(arg)
        print(f'{arg}:')
        print(f'  full:       {uuid}')
        print(f'  compressed: {compress_uuid(uuid)}')
    else:
        print(compress_uuid(arg))
