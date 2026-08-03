import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { IGoogleIdentityVerifier, VerifiedGoogleIdentity } from '../../application/ports/google-identity-verifier.port';

@Injectable()
export class GoogleIdentityVerifierService implements IGoogleIdentityVerifier {
  constructor(private readonly configService: ConfigService) {}

  private get clientId(): string {
    const clientId = this.configService.get<string>('google.clientId');
    if (!clientId) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured on this deployment -- Google sign-in cannot run without it.',
      );
    }
    return clientId;
  }

  async verify(idToken: string): Promise<VerifiedGoogleIdentity> {
    const clientId = this.clientId;
    const client = new OAuth2Client(clientId);

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid or expired Google credential.');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Google did not return an email address for this account.');
    }

    return {
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
    };
  }
}
