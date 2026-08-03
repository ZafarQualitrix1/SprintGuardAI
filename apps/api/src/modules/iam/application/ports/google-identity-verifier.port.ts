export const GOOGLE_IDENTITY_VERIFIER = Symbol('IGoogleIdentityVerifier');

export interface VerifiedGoogleIdentity {
  email: string;
  emailVerified: boolean;
  name: string | null;
}

// Port implemented by Infrastructure's GoogleIdentityVerifierService (google-auth-library).
// Verifies a Google Identity Services ID token server-side -- audience/signature/expiry are all
// checked by the library against Google's published keys, so a forged or expired credential never
// reaches GoogleSignInHandler.
export interface IGoogleIdentityVerifier {
  verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}
