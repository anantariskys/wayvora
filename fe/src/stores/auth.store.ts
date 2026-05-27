let accessToken: string | null = null;

export const authTokenStore = {
  getAccessToken() {
    return accessToken;
  },
  setAccessToken(token: string | null) {
    accessToken = token;
  },
  clear() {
    accessToken = null;
  },
};
