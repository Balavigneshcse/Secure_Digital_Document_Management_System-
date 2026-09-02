import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, ExtractJwt } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';
import { AuthService } from '../auth.service.js';

export interface KeycloakJwtPayload {
  sub: string;
  email: string;
  preferred_username?: string;
  name?: string;
  realm_access?: { roles: string[] };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: config.get<string>('KEYCLOAK_JWKS_URI')!,
      }),
      issuer: config.get<string>('KEYCLOAK_ISSUER'),
      algorithms: ['RS256'],
    });
  }

  // Whatever this returns becomes `req.user`. We attach both the full synced
  // DB user (with its role relation) and a precomputed `roleCode` so guards
  // and controllers never need to re-derive it from the DB role name.
  async validate(payload: KeycloakJwtPayload) {
    const user = await this.authService.validateAndSyncUser(payload);
    const roleCode = this.authService.toAuthUserDto(user).role;
    return { ...user, roleCode };
  }
}
