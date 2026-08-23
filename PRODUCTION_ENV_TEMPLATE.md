# Production environment template

Copy these values into the secret manager of the chosen hosting provider. Do not commit real values to Git.

```dotenv
NODE_ENV=production
DATABASE_URL="postgresql://USER:PASSWORD@MANAGED_DATABASE_HOST:5432/clinicos"
API_PORT=3001
API_HOST=0.0.0.0
FRONTEND_URL="https://app.example.com"
NEXT_PUBLIC_API_URL="https://api.example.com"
JWT_SECRET="GENERATE_A_UNIQUE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS"
JWT_REFRESH_SECRET="GENERATE_A_SECOND_UNIQUE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID="GOOGLE_OAUTH_CLIENT_ID"
GOOGLE_CLIENT_SECRET="GOOGLE_OAUTH_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="https://api.example.com/api/v1/auth/google/callback"
APP_VERSION=0.0.1
```

For the hosted frontend, set `NEXT_PUBLIC_DEMO_MODE=false` and
`NEXT_PUBLIC_API_URL=https://api.example.com` in Vercel. These are public
build-time values, so never place database URLs or OAuth secrets in Vercel's
`NEXT_PUBLIC_*` variables.
