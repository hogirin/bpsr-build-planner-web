from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src'
IMPORT_PATTERN = re.compile(r'(?:from\s+|import\s*)\x27(\.[^\x27]+)\x27')
EXTENSIONS = ('.ts', '.tsx', '.json', '.css', '.png')


def resolves(source_file: Path, specifier: str) -> bool:
    target = source_file.parent / specifier
    candidates = [target]
    candidates.extend(Path(f'{target}{extension}') for extension in EXTENSIONS)
    candidates.extend(target / f'index{extension}' for extension in EXTENSIONS)
    return any(candidate.is_file() for candidate in candidates)


def main() -> None:
    for json_file in ROOT.rglob('*.json'):
        if '.git' not in json_file.parts:
            json.loads(json_file.read_text(encoding='utf-8'))

    missing: list[str] = []
    for source_file in [*SOURCE.rglob('*.ts'), *SOURCE.rglob('*.tsx')]:
        text = source_file.read_text(encoding='utf-8')
        for specifier in IMPORT_PATTERN.findall(text):
            if not resolves(source_file, specifier):
                missing.append(f'{source_file.relative_to(ROOT)} -> {specifier}')

    if missing:
        raise SystemExit('Missing relative imports:\n' + '\n'.join(missing))

    print('JSON and relative import checks passed.')


if __name__ == '__main__':
    main()
