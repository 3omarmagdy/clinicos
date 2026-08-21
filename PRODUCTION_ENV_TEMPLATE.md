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
JWT_EXPIRES_IN=15m
APP_VERSION=0.0.1
```
