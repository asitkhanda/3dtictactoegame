// Verifies a StoreKit 2 signed transaction (a JWS) from the App Store.
//
// Apple signs each transaction with a leaf certificate that chains through an
// intermediate to the Apple Root CA - G3, and ships all three in the JWS header
// (`x5c`). Trusting the header alone would let anyone mint a transaction, so the
// root is pinned by fingerprint, each link's signature is checked, and Apple's
// marker extensions confirm the certificates were issued for App Store receipts.
//
// https://developer.apple.com/documentation/appstoreserverapi/jwstransaction

import { X509Certificate } from 'npm:@peculiar/x509@1.12.3';
import { compactVerify, decodeProtectedHeader, importX509 } from 'npm:jose@5.9.6';

/** SHA-256 of Apple Root CA - G3 (https://www.apple.com/certificateauthority/). */
export const APPLE_ROOT_G3_SHA256 =
  '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';

const LEAF_MARKER_OID = '1.2.840.113635.100.6.11.1';
const INTERMEDIATE_MARKER_OID = '1.2.840.113635.100.6.2.1';

export interface AppStoreTransaction {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  type: string;
  environment: string;
  signedDate: number;
  purchaseDate: number;
  revocationDate?: number;
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toPem(base64Der: string): string {
  const lines = base64Der.match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

function validAt(certificate: X509Certificate, at: Date): boolean {
  return certificate.notBefore <= at && at <= certificate.notAfter;
}

/**
 * Returns the transaction's claims, or throws if the signature, the certificate
 * chain or the pinned root doesn't check out. `pinnedRootSha256` is injectable
 * so tests can use a throwaway chain.
 */
export async function verifyAppStoreTransaction(
  jws: string,
  pinnedRootSha256: string = APPLE_ROOT_G3_SHA256,
): Promise<AppStoreTransaction> {
  const header = decodeProtectedHeader(jws);
  if (header.alg !== 'ES256') throw new Error('Unexpected signing algorithm');
  const chain = header.x5c;
  if (!Array.isArray(chain) || chain.length !== 3) throw new Error('Unexpected certificate chain');

  const [leaf, intermediate, root] = chain.map((der) => new X509Certificate(der));

  const rootFingerprint = hex(await crypto.subtle.digest('SHA-256', root.rawData));
  if (rootFingerprint !== pinnedRootSha256.toLowerCase()) throw new Error('Untrusted root certificate');

  if (!(await intermediate.verify({ publicKey: root.publicKey, signatureOnly: true }))) {
    throw new Error('Intermediate certificate is not signed by the root');
  }
  if (!(await leaf.verify({ publicKey: intermediate.publicKey, signatureOnly: true }))) {
    throw new Error('Leaf certificate is not signed by the intermediate');
  }
  if (!leaf.getExtension(LEAF_MARKER_OID) || !intermediate.getExtension(INTERMEDIATE_MARKER_OID)) {
    throw new Error('Certificates were not issued for App Store transactions');
  }

  const key = await importX509(toPem(chain[0]), 'ES256');
  const { payload } = await compactVerify(jws, key);
  const claims = JSON.parse(new TextDecoder().decode(payload)) as AppStoreTransaction;

  // Certificates must have been valid when Apple signed the transaction.
  const signedAt = new Date(claims.signedDate);
  if (![root, intermediate, leaf].every((certificate) => validAt(certificate, signedAt))) {
    throw new Error('Certificate was not valid when the transaction was signed');
  }
  return claims;
}
