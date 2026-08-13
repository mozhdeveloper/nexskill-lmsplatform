// CertificateAnchorProvider adapter (§35, §64, §97). A real implementation would submit
// `payloadHash` to a low-cost blockchain/network and return the transaction reference.
// Certificate issuance never blocks on this call succeeding — see
// lib/domains/certification/certificates.ts.

export interface AnchorRequest {
  certificateId: string;
  payloadHash: string;
}

export interface AnchorResult {
  chain: string | null;
  transactionHash: string | null;
  blockReference: string | null;
  anchoredAt: string | null;
  verificationStatus: "unanchored" | "pending" | "anchored" | "failed";
}

export interface CertificateAnchorProvider {
  anchor(request: AnchorRequest): Promise<AnchorResult>;
}
