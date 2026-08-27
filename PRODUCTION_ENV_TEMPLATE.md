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

# Client-visible manual payment instructions. Do not use these for secrets.
PAYMENT_BANK_NAME="YOUR_BANK_NAME"
PAYMENT_ACCOUNT_NAME="YOUR_ACCOUNT_HOLDER_NAME"
PAYMENT_ACCOUNT_NUMBER="YOUR_ACCOUNT_NUMBER_OR_MASKED_ACCOUNT"
PAYMENT_IBAN="YOUR_IBAN_IF_APPLICABLE"
PAYMENT_INSTAPAY_ADDRESS="YOUR_INSTAPAY_ADDRESS"
PAYMENT_REVIEW_WINDOW="تتم مراجعة الطلب خلال أيام العمل بعد التحقق من التحويل."
PAYMENT_INSTRUCTIONS_NOTE="لا ترسل كلمة المرور أو PIN أو OTP أو بيانات البطاقة. أدخل رقم العملية فقط."

# Transactional email delivery. Keep the API key in Vercel only.
RESEND_API_KEY="YOUR_RESEND_API_KEY"
EMAIL_FROM="Clinicos <noreply@your-verified-domain.com>"
```

For the hosted frontend, set `NEXT_PUBLIC_DEMO_MODE=false` and
`NEXT_PUBLIC_API_URL=https://api.example.com` in Vercel. These are public
build-time values, so never place database URLs or OAuth secrets in Vercel's
`NEXT_PUBLIC_*` variables.
