# LifeVault Backend

API and serverless backend for LifeVault, a personal journaling/memory-keeping app.

## Overview

LifeVault Backend is an Express/MongoDB API that powers a private journaling app: users create dated "posts" (text, photos, or video) tagged with mood, location, and custom tags, and can browse, search, and favourite them later. Media is uploaded directly to Cloudinary from the client using signed, time-limited upload credentials issued by the API, rather than being proxied through the server. The service is designed to run both as a normal Express server and as an AWS Lambda function behind API Gateway.

## Problem it solves

Gives users a private, searchable timeline of personal memories (journal entries, photos, videos) with rich filtering (by date range, mood, location, tags, free text) without requiring the backend to handle large file uploads/downloads directly — Cloudinary does the heavy lifting for storage, transformation and secure delivery.

## Key features

- **Post/journal entries** with caption, mood, background colour, geo-location, custom tags, and attached media files, filterable by content type, date range, single date, location, tags, and free-text search, with pagination.
- **Cloudinary-signed direct uploads**: `/api/post/get-signature` returns a timestamp + HMAC signature so the client can upload media straight to Cloudinary; the backend never touches the raw file bytes.
- **Authenticated, signed media delivery**: stored files are private/authenticated in Cloudinary, and the API generates signed URLs on read (including on-the-fly generated video thumbnails as JPG frames) so media can't be accessed without going through the app.
- **Full auth flow**: email/password signup+login, Google OAuth sign-in/sign-up in one endpoint, OTP-based email verification, and a two-step OTP → reset-token → password-reset flow (hashed OTPs/tokens with 15-minute expiry) delivered via Gmail SMTP through Nodemailer.
- **Cascading account deletion**: deleting a user also walks all of their posts, deletes each associated file from Cloudinary, removes the posts from MongoDB, and strips references from other users' favourites.
- **Favourites** and a lightweight autocomplete-style search-suggestions endpoint over captions/locations.
- **App-version endpoint** (`/api/app/latest-version`) backed by a singleton `AppModel` document, auto-created on server boot if missing — useful for the mobile client to check for forced/soft updates.
- **Dual deployment targets**: runs as a normal long-lived Express server (`index.js`, `app.listen`) and as an AWS Lambda handler via `serverless-http` (`handler.js` + `serverless.yml`), with Elastic Beanstalk config (`.ebextensions`, `.platform/nginx`) also present for an alternate deployment path.

## Tech stack

- Node.js (ES modules), Express 5
- MongoDB with Mongoose
- Cloudinary SDK for media storage/transformation/signed delivery
- JWT (`jsonwebtoken`) + `bcryptjs` for auth
- `multer` for multipart form handling
- `nodemailer` (Gmail) for OTP/password-reset emails
- `crypto` for OTP/reset-token hashing
- `serverless-http` + Serverless Framework (AWS Lambda/API Gateway) for one deployment path; Elastic Beanstalk/nginx config for another

## Setup / running instructions

```bash
npm install
```

Create a `.env` with:

```
PORT=3000
MONGO_URI=<mongodb connection string>
JWT_SECRET=<jwt secret>
EMAIL_USER=<gmail address for sending OTP/reset mail>
EMAIL_PASS=<gmail app password>
BACKEND_URL=<public backend URL>
CLOUDINARY_CLOUD_NAME=<cloudinary cloud name>
CLOUDINARY_API_KEY=<cloudinary api key>
CLOUDINARY_API_SECRET=<cloudinary api secret>
```

Run as a standard server:

```bash
npm start
```

Deploy as AWS Lambda (Serverless Framework):

```bash
npx serverless deploy
```

### API surface

- `POST /api/auth/signup`, `POST /api/auth/login` (supports `loginType: "google"`)
- `POST /api/auth/password-reset-req`, `POST /api/auth/submitOTP`, `POST /api/auth/reset-password`
- `POST /api/auth/verify-Email-otp`
- `POST /api/post/create-post`, `POST /api/post/get-posts`, `DELETE /api/post/delete-post`
- `POST /api/post/get-search-suggestions`, `PUT /api/post/handle-favourite`, `POST /api/post/get-favourites-by-id`
- `POST /api/post/update-profile`, `POST /api/post/delete-account`
- `GET /api/post/get-signature` — Cloudinary signed-upload credentials
- `GET /api/app/latest-version`
- `GET /health` — health check for load balancer/ALB
