import fs from 'fs';
import path from 'path';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  webhookId?: string;
  webhookExpiresAt?: number; // Unix timestamp in ms
  ghlAccessToken?: string;
  ghlRefreshToken?: string;
  ghlLocationId?: string;
}

const TOKEN_FILE_PATH = path.resolve(process.cwd(), 'data', 'tokens.json');

export class TokenStore {
  private static ensureDataDir() {
    const dir = path.dirname(TOKEN_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public static getTokens(): TokenData | null {
    try {
      this.ensureDataDir();
      if (!fs.existsSync(TOKEN_FILE_PATH)) {
        return null;
      }
      const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
      return JSON.parse(data) as TokenData;
    } catch (err) {
      console.error('[TokenStore] Error reading tokens:', err);
      return null;
    }
  }

  public static saveTokens(tokens: Partial<TokenData>) {
    try {
      this.ensureDataDir();
      const existing = this.getTokens() || {
        accessToken: '',
        refreshToken: '',
        expiresAt: 0,
      };
      const updated = { ...existing, ...tokens };
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
      console.log('[TokenStore] Tokens successfully updated.');
    } catch (err) {
      console.error('[TokenStore] Error saving tokens:', err);
    }
  }
}
