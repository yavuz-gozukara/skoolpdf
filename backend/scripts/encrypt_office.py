#!/usr/bin/env python3
"""
Encrypt an Office file (doc/docx/xls/xlsx/ppt/pptx) with a password
using the ECMA-376 standard (same as Microsoft Office).

Usage: python3 encrypt_office.py <input_path> <output_path> <password>
"""
import sys
import msoffcrypto

def main():
    if len(sys.argv) != 4:
        print('Usage: encrypt_office.py <input> <output> <password>', file=sys.stderr)
        sys.exit(1)

    input_path, output_path, password = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(input_path, 'rb') as f:
        office_file = msoffcrypto.OfficeFile(f)
        with open(output_path, 'wb') as out:
            office_file.encrypt(password, out)

if __name__ == '__main__':
    main()
