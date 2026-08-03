'use client';

import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useGoogleSignIn } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

// Google Identity Services' ID-token flow: the rendered button collects the credential entirely
// client-side (no redirect/callback route), we verify it server-side in GoogleSignInHandler
// (apps/api/.../google-sign-in.command.ts), and only then mint our own session.
export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleSignIn = useGoogleSignIn();

  if (!clientId) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="flex justify-center">
        <GoogleLogin
          theme="filled_black"
          width="336"
          onSuccess={(credentialResponse) => {
            const credential = credentialResponse.credential;
            if (!credential) {
              onError?.('Google did not return a credential.');
              return;
            }
            googleSignIn.mutate(
              { credential },
              {
                onSuccess,
                onError: (error) =>
                  onError?.(error instanceof ApiError ? error.message : 'Unable to sign in with Google.'),
              },
            );
          }}
          onError={() => onError?.('Google sign-in was cancelled or failed.')}
        />
      </div>
    </GoogleOAuthProvider>
  );
}
