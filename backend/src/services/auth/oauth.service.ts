export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scope: string[];
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  provider: string;
}

export class OAuthService {
  private config: OAuthProviderConfig;

  constructor(config: OAuthProviderConfig) {
    this.config = config;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scope.join(" "),
      state
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    return {
      accessToken: `mock-token-${code}`,
      refreshToken: `mock-refresh-${code}`,
      expiresIn: 3600,
      provider: this.config.authUrl
    };
  }
}
