#!/bin/sh
# Đóng dấu phiên bản rồi chép 404.html. Chạy trước mỗi lần commit website.
set -e
cd "$(dirname "$0")/.."
V=$(date -u +%Y%m%d%H%M%S)
sed -i "s/var VER=\"[^\"]*\"/var VER=\"$V\"/" index.html
printf '%s\n' "$V" > ver.txt
cp index.html 404.html
echo "phiên bản $V"
