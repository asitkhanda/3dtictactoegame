#!/usr/bin/env bash
# Uploads a new version of Twisted Tac to the PhonePe Indus Appstore with its Update API.
#
#   PHONEPE_AUTH='O-Bearer <key from Developer Console > Tools & Resources>' \
#     android/tools/phonepe-upload.sh [path/to/app-release.apk]
#
# The first submission of an app must go through the Developer Console; this is for updates after that.
# The key is shown once when you enable the Update API in the console: keep it in a password manager,
# never in the repository. PHONEPE_AUTH is the whole header value as the console shows it.
#
# Not exercised against the live API yet (it needs an app that has already been submitted). It follows
# "APK Upgrade/Upload V3" in the console's API reference: POST the APK as a binary stream.
set -euo pipefail

PACKAGE="com.twistedtac.app"
BASE_URL="https://developer-api.phonepeappstore.com"
APK="${1:-$(dirname "$0")/../app/build/outputs/apk/release/app-release.apk}"

if [[ -z "${PHONEPE_AUTH:-}" ]]; then
  echo "Set PHONEPE_AUTH to the Authorization value from the Developer Console." >&2
  exit 1
fi
if [[ ! -f "$APK" ]]; then
  echo "No APK at $APK. Build it first: ./gradlew :app:assembleRelease" >&2
  exit 1
fi

echo "Uploading $(basename "$APK") ($(du -h "$APK" | cut -f1)) for $PACKAGE..."
curl --fail-with-body --silent --show-error \
  -X POST "$BASE_URL/devtools/apk/upgrade/$PACKAGE" \
  -H "Authorization: $PHONEPE_AUTH" \
  -H "Accept-version: 3.0.0" \
  --data-binary "@$APK"
echo

echo "Versions and review state:"
curl --fail-with-body --silent --show-error \
  "$BASE_URL/devtools/app/versions/$PACKAGE" \
  -H "Authorization: $PHONEPE_AUTH"
echo
