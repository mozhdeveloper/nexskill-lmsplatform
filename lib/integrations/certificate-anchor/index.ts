import type { AnchorRequest, AnchorResult, CertificateAnchorProvider } from "./types";

/**
 * No-op adapter: used whenever CERT_ANCHOR_PROVIDER_API_KEY is unset. Certificates issue
 * normally with verification_status='unanchored' — the certificate is fully valid and
 * verifiable by number without a blockchain reference (§104: anchoring failure/absence must
 * never corrupt issuance).
 */
class NoopCertificateAnchorProvider implements CertificateAnchorProvider {
  async anchor(_request: AnchorRequest): Promise<AnchorResult> {
    return {
      chain: null,
      transactionHash: null,
      blockReference: null,
      anchoredAt: null,
      verificationStatus: "unanchored",
    };
  }
}

function getProvider(): CertificateAnchorProvider {
  // A real provider implementation would be selected here based on
  // process.env.CERT_ANCHOR_PROVIDER_API_KEY, matching lib/integrations/*'s adapter pattern
  // documented in docs/nexskill-architecture.md §6.
  return new NoopCertificateAnchorProvider();
}

export async function anchorCertificate(request: AnchorRequest): Promise<AnchorResult> {
  return getProvider().anchor(request);
}
