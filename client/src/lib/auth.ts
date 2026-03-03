const ACCESS_TOKEN_KEY = 'ahp.accessToken'
const REFRESH_TOKEN_KEY = 'ahp.refreshToken'

export function writeTokens(accessToken: string, refreshToken: string | null) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function readAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function readRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}
