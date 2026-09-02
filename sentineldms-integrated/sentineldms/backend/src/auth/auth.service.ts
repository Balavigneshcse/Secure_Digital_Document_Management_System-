import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { User } from '@prisma/client';

// ------------------------------------------------------------------
// Role model
//
// Arunkumar's schema stores roles as a normalized table (name + JSONB
// permissions), not a simple enum — richer, but it means every layer that
// wants to reason about "which role" needs a stable short code. This is
// that mapping, shared by every place that needs to go
// Keycloak realm role  <->  our Role.name row  <->  frontend's Role union.
//
// Dharani's Keycloak realm issues 5 roles; Arunkumar's seed has 6 Role rows
// (2 of which — "Department Head" and "Read Only" — aren't issued by any
// Keycloak role yet). Frontend's Role type only had 4 codes and was missing
// an auditor tier entirely, so this integration adds 'AUDITOR' to close
// that gap (see types/index.ts change on the frontend side).
// ------------------------------------------------------------------

export type RoleCode = 'ADMIN' | 'IO' | 'JUDGE' | 'FORENSIC' | 'AUDITOR';

const KEYCLOAK_REALM_ROLE_TO_CODE: Record<string, RoleCode> = {
  admin: 'ADMIN',
  investigating_officer: 'IO',
  forensic_expert: 'FORENSIC',
  judicial_officer: 'JUDGE',
  auditor: 'AUDITOR',
};

// Maps a role code to the exact `roles.name` row it should be linked to.
// Must match seeds/001_seed_data.sql (plus the 'Auditor' row this
// integration adds — see database/seeds/002_auditor_role.sql).
const ROLE_CODE_TO_DB_NAME: Record<RoleCode, string> = {
  ADMIN: 'Super Admin',
  IO: 'Investigating Officer',
  FORENSIC: 'Forensic Expert',
  JUDGE: 'Judicial Officer',
  AUDITOR: 'Auditor',
};

// Reverse mapping, extended with the two seeded roles that aren't tied to
// any Keycloak realm role — mapped to the closest equivalent so every
// seeded user always resolves to *some* valid frontend Role code.
const DB_NAME_TO_ROLE_CODE: Record<string, RoleCode> = {
  'Super Admin': 'ADMIN',
  'Investigating Officer': 'IO',
  'Forensic Expert': 'FORENSIC',
  'Judicial Officer': 'JUDGE',
  Auditor: 'AUDITOR',
  'Department Head': 'ADMIN', // closest existing tier with case-approval authority
  'Read Only': 'AUDITOR', // closest existing tier — read-only observer
};

export function dbRoleNameToCode(name: string): RoleCode {
  return DB_NAME_TO_ROLE_CODE[name] ?? 'IO';
}

export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
  avatarInitials: string;
}

interface PendingLogin {
  keycloakAccessToken: string;
  email: string;
  expiresAt: number;
}

interface KeycloakTokenPayload {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles: string[] };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory store bridging /auth/login -> /auth/mfa/verify. A tempToken is
  // single-use and expires in 5 minutes. Fine for a single-instance
  // hackathon deployment — swap for Redis (already running in
  // docker-compose) before running more than one backend instance.
  private readonly pendingLogins = new Map<string, PendingLogin>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get tokenEndpoint(): string {
    const base = this.config.get<string>('KEYCLOAK_BASE_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');
    return `${base}/realms/${realm}/protocol/openid-connect/token`;
  }

  private decodeJwtPayload(token: string): KeycloakTokenPayload {
    const payloadSegment = token.split('.')[1];
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    return JSON.parse(json);
  }

  private resolveRoleCode(realmRoles: string[]): RoleCode {
    for (const realmRole of realmRoles) {
      const code = KEYCLOAK_REALM_ROLE_TO_CODE[realmRole.toLowerCase()];
      if (code) return code;
    }
    this.logger.warn(`No known role in token realm_access.roles: [${realmRoles.join(', ')}] — defaulting to IO`);
    return 'IO';
  }

  private computeInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
    return initials.join('') || '?';
  }

  private async getOrCreateRole(code: RoleCode) {
    const name = ROLE_CODE_TO_DB_NAME[code];
    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) return existing;
    // Shouldn't normally happen if the seed ran — created defensively so
    // login never hard-fails just because a role row is missing.
    this.logger.warn(`Role "${name}" not found in DB — creating a minimal placeholder row.`);
    return this.prisma.role.create({
      data: { name, description: `Auto-created for role code ${code}`, permissions: [], isSystem: false },
    });
  }

  toAuthUserDto(user: User & { role: { name: string } }): AuthUserDto {
    const roleCode = dbRoleNameToCode(user.role.name);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleCode,
      avatarInitials: this.computeInitials(user.name),
    };
  }

  // Called on every authenticated request (from JwtStrategy) AND right after
  // MFA verification. Bridges three cases: a returning user (match by
  // keycloak_id), a pre-seeded user logging in for the first time (match by
  // email, backfill keycloak_id), or a genuinely new user (create).
  async validateAndSyncUser(payload: KeycloakTokenPayload) {
    const roleCode = this.resolveRoleCode(payload.realm_access?.roles ?? []);
    const name = payload.name ?? payload.preferred_username ?? payload.email;

    const byKeycloakId = await this.prisma.user.findUnique({
      where: { keycloakId: payload.sub },
      include: { role: true },
    });
    if (byKeycloakId) {
      return this.prisma.user.update({
        where: { id: byKeycloakId.id },
        data: { email: payload.email, name, lastLoginAt: new Date() },
        include: { role: true },
      });
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { role: true },
    });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { keycloakId: payload.sub, name, lastLoginAt: new Date() },
        include: { role: true },
      });
    }

    const role = await this.getOrCreateRole(roleCode);
    return this.prisma.user.create({
      data: {
        id: randomUUID(),
        keycloakId: payload.sub,
        email: payload.email,
        name,
        roleId: role.id,
        lastLoginAt: new Date(),
      },
      include: { role: true },
    });
  }

  // Step 1 of the frontend's 2-step login: validate credentials against
  // Keycloak's password grant, park the resulting access token behind a
  // short-lived tempToken, and tell the frontend MFA is required (matches
  // its UI flow even though we don't have real TOTP configured yet — the
  // prototype's MFA step accepts any 6-digit code; the actual auth already
  // happened here, against real Keycloak).
  async login(email: string, password: string): Promise<{ mfaRequired: boolean; tempToken: string }> {
    const clientId = this.config.get<string>('KEYCLOAK_CLIENT_ID');
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId!,
      username: email,
      password,
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post<{ access_token: string }>(this.tokenEndpoint, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }),
      );

      const tempToken = randomUUID();
      this.pendingLogins.set(tempToken, {
        keycloakAccessToken: data.access_token,
        email,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return { mfaRequired: true, tempToken };
    } catch (err) {
      this.logger.warn(`Login failed for ${email}: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  // Step 2: exchange the tempToken + (any 6-digit) code for the real token
  // and the synced user record.
  async verifyMfa(tempToken: string, _code: string): Promise<{ token: string; user: AuthUserDto }> {
    const pending = this.pendingLogins.get(tempToken);
    this.pendingLogins.delete(tempToken); // single-use regardless of outcome

    if (!pending || pending.expiresAt < Date.now()) {
      throw new UnauthorizedException('Login session expired — please log in again');
    }

    const payload = this.decodeJwtPayload(pending.keycloakAccessToken);
    const user = await this.validateAndSyncUser(payload);

    return { token: pending.keycloakAccessToken, user: this.toAuthUserDto(user) };
  }
}
