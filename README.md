# AI Chatbot — Text + Image Generation

**Repository:** `SohamBhattacharjee2003/Chatbot`

**Live demo:** [https://chatbot-woad-iota.vercel.app/](https://chatbot-woad-iota.vercel.app/)

---

## Short description (repo tagline)

AI-powered chat application built with the MERN stack that generates both conversational text and images using OpenAI, stores/serves media with ImageKit, and supports paid features through Stripe.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Key Features](#key-features)
* [Tech Stack](#tech-stack)
* [Architecture & Flow](#architecture--flow)
* [Getting Started (Local)](#getting-started-local)

  * [Prerequisites](#prerequisites)
  * [Environment Variables](#environment-variables)
  * [Install & Run](#install--run)
* [Deployment Notes](#deployment-notes)
* [How It Works — Implementation Details](#how-it-works---implementation-details)

  * [OpenAI integration](#openai-integration)
  * [ImageKit integration](#imagekit-integration)
  * [Stripe integration](#stripe-integration)
* [Project Structure (High-level)](#project-structure-high-level)
* [Testing & Troubleshooting](#testing--troubleshooting)
* [Contributing](#contributing)
* [License](#license)
* [Contact](#contact)

---

## Project Overview

This project is a production-oriented AI chatbot that supports *both* natural-language conversation and AI-generated images. The app exposes a polished UI (deployed on Vercel), a backend API (Node/Express) backed by MongoDB, and paid/premium features managed via Stripe. Image storage/optimization/delivery is handled via ImageKit for fast CDN delivery.

Designed for: demos, prototypes, teaching samples, and as a foundation for commercial products that want conversational + visual AI features in one package.

---

## Key Features

* Text generation & completion using OpenAI (chat, prompts, context/history-aware replies).
* Image generation via OpenAI image endpoints (or image model) and/or pipeline to ImageKit.
* Image upload, optimization, and CDN delivery using ImageKit.
* Stripe payments for premium features (credits, subscriptions, or per-generation billing).
* Persistent chat history stored in MongoDB per user.
* Clean, responsive frontend (React) and deployment-ready configuration (Vercel-friendly).

---

## Tech Stack

* **Frontend:** React (compatible with Next.js if used), client-side UI components
* **Backend:** Node.js + Express
* **Database:** MongoDB (Atlas or self-hosted)
* **AI:** OpenAI APIs (text & image generation)
* **Storage/CDN:** ImageKit
* **Payments:** Stripe (Secrets on server)
* **Auth (suggested):** JWT / session-based auth
* **Deployment:** Vercel (frontend), any Node host (backend) or unified deployment

---

## Architecture & Flow

1. User interacts with the React UI and sends chat messages.
2. Frontend calls backend API endpoints (`/api/chat`, `/api/generate-image`, etc.).
3. Backend validates auth, applies rate limits or credit checks (if using Stripe), and forwards requests to OpenAI.
4. Generated images are uploaded (or proxied) to ImageKit for CDN delivery and stored metadata in MongoDB.
5. Stripe handles purchases; server verifies Stripe webhooks to grant credits/subscriptions.
6. Chat history and usage metrics are recorded in MongoDB.

## System Architecture

```mermaid
flowchart LR
  A[User (Browser)] --> B[Frontend (React)]
  B --> C[API Server (Node/Express)]
  C --> D{Auth & Billing}
  C --> E[OpenAI (Text & Image)]
  E --> F[ImageKit (CDN & Storage)]
  C --> G[MongoDB]
  C --> H[Stripe]
  subgraph Workers
    I[Background Workers / Queue (Redis + Bull)]
  end
  C --> I
  I --> E
  I --> F

  style A fill:#f9f,stroke:#333,stroke-width:1px
  style B fill:#bbf,stroke:#333,stroke-width:1px
  style C fill:#bfb,stroke:#333,stroke-width:1px
  style E fill:#ffd,stroke:#333,stroke-width:1px
  style F fill:#efe,stroke:#333,stroke-width:1px
  style G fill:#eef,stroke:#333,stroke-width:1px
  style H fill:#fdd,stroke:#333,stroke-width:1px
  style I fill:#fcc,stroke:#333,stroke-width:1px
```

*A compact flowchart showing the core request path: user → frontend → API → OpenAI/ImageKit/DB/Stripe, with background workers for heavy jobs.*

This section describes the high-level system architecture, component responsibilities, data flow, and operational concerns so the project can be deployed, scaled, and maintained in production.

### Components

* **Client (React / Next.js)** — Rich single-page UI that handles user input, displays chat history and images, and talks to backend APIs over HTTPS. Handles optimistic UI updates and local state caching.
* **API Server (Node.js + Express)** — Central backend that authenticates users, enforces billing/rate limits, orchestrates calls to OpenAI, uploads images to ImageKit, and persists chat & metadata to MongoDB.
* **Database (MongoDB)** — Stores user profiles, chat sessions/messages, image metadata, usage logs, and billing/credit records.
* **OpenAI (External Service)** — Provides text and image generation APIs. Accessed only from the backend with the secret API key.
* **ImageKit (CDN & Storage)** — Hosts generated and user-uploaded images; returns CDN URLs for fast delivery, thumbnails, and transformations.
* **Stripe (Payments)** — Manages payments, subscriptions, and webhooks to update credits and subscription status.
* **Caching & Queue (Redis; optional)** — Redis can be used for caching recent responses and implementing an async job queue (e.g., Bull) for long-running image-generation or post-processing tasks.
* **Monitoring & Logging (e.g., Sentry, Prometheus, Grafana)** — Capture errors, performance metrics, and business metrics (number of generations, latencies, costs).
* **Webhooks & Background Workers** — Dedicated workers to process Stripe webhooks, post-process images, and run scheduled cleanup or billing reconciliation jobs.

### Data Flow (Sequence)

1. User types a prompt and submits.
2. Frontend POSTs the request to `/api/chat` including auth token and optional session id.
3. Backend validates token, checks credits/rate limits, and enqueues the request or calls OpenAI synchronously depending on config.
4. OpenAI returns text (and/or a generated image payload). If an image is returned as bytes/URL, backend uploads it to ImageKit and stores the CDN URL.
5. Backend stores message and metadata in MongoDB and returns the composed response to the client.
6. Client displays the chat reply and image; analytics and usage counters are updated asynchronously.

### Security & Privacy

* Keep OpenAI, ImageKit private keys on the server only.
* Validate and sanitize user inputs to avoid prompt injection and unsafe content forwarding.
* Verify Stripe webhooks using the webhook signing secret.
* Use HTTPS for all traffic and set secure cookie flags (if using cookies). Use JWT or server sessions for auth.
* Rate-limit endpoints and implement quotas per user to avoid unexpected API costs.

### Scalability & Reliability

* **Horizontal scale**: Stateless API servers behind a load balancer; use shared Redis for session/cache and MongoDB Atlas for managed scaling.
* **Async image jobs**: Offload image generation and upload to background workers to reduce request latency and retry on failures.
* **Caching**: Cache repeat prompts/results where applicable to reduce OpenAI calls and cost.
* **Cost control**: Track token & image usage per user; enforce quotas or billing checks before making expensive OpenAI calls.
* **Observability**: Instrument request latencies, error rates, and billing metrics. Use alerts for unexpected cost spikes.

### Suggested Endpoints (subset)

* `POST /api/auth/login` — user login
* `POST /api/auth/register` — create account
* `POST /api/chat` — send prompt and get chat reply
* `POST /api/generate-image` — request a dedicated image generation (if separated)
* `POST /api/upload` — upload user images (sent to ImageKit)
* `POST /api/stripe/webhook` — Stripe webhook handler
* `GET /api/history/:userId` — fetch chat history

### Deployment Topology

* Frontend: Vercel (or Netlify). Use edge caching for static assets.
* Backend: Vercel Serverless Functions (if light), or Render/Railway/Heroku/EC2 for persistent workers and webhook reliability.
* Database: MongoDB Atlas with multi-region replicas for lower-latency reads.
* Redis/Queue: Managed Redis for job queues (e.g., Upstash, Redis Labs).

---

## Deployment Notes

* **Frontend:** Deploy on Vercel for zero-config deployments. Add environment variables in the Vercel dashboard.
* **Backend:** You can deploy the backend to Vercel (serverless functions), Render, Railway, Heroku, or any VPS. Ensure webhooks (Stripe) are reachable and secure.
* **MongoDB:** Use MongoDB Atlas for an easy hosted DB; set the `MONGO_URI` accordingly.
* **Stripe Webhooks:** Use Stripe CLI for local testing, and set the `STRIPE_WEBHOOK_SECRET` in production.

---

## How It Works — Implementation Details

### OpenAI integration

* Server makes authenticated requests to OpenAI for completions/chat and for generating images.
* Conversations may be stored and passed as `messages` for context to the OpenAI Chat API.
* Make sure to handle token usage and errors gracefully (rate limits, timeouts).

### ImageKit integration

* Upload generated images (or user uploads) to ImageKit via the SDK/server-side upload to keep private keys secure.
* Store the returned CDN URL in your database for fast access in the client.

### Stripe integration

* Use server-only secret key to create payment intents, handle subscriptions or one-off purchases.
* Verify Stripe webhook signatures on the backend to securely grant credits or update subscription status.
* Keep billing logic idempotent and safe for repeated webhook calls.

---

## Project Structure (High-level)

```
/Chatbot
  /client            # React or Next.js frontend
  /server            # Express API, OpenAI calls, Stripe webhooks
  README.md
  .env.example
```

If your repo uses a monorepo or different structure, adjust this section to match the actual layout.

---

## Testing & Troubleshooting

* If image generation fails: check `OPENAI_API_KEY`, and ensure your usage plan supports image endpoints.
* If uploads fail: verify ImageKit keys and endpoint, and that uploads are done server-side (private key).
* If payments fail: check Stripe test keys, webhook endpoint, and check logs for `idempotency_key` issues.

---

## Contributing

Thanks for considering contributions! A recommended CONTRIBUTING.md workflow:

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make changes, add tests if applicable
4. Open a pull request with a clear description

Please follow consistent formatting and linting. Add tests or manual reproduction steps for bug fixes.

---

## License

Suggested: **MIT License** — lightweight and permissive. Add a `LICENSE` file if you choose it.

---

## Contact

Maintainer: **Soham Bhattacharjee**

* GitHub: `https://github.com/SohamBhattacharjee2003`
* Live demo: [https://chatbot-woad-iota.vercel.app/](https://chatbot-woad-iota.vercel.app/)

---

If you'd like, I can:

* generate a `README.md` file you can copy/paste or commit directly,
* craft a shorter `GitHub repository description` and `README` banner (badges + one-line), or
* produce a polished `CONTRIBUTING.md`, `SECURITY.md`, or `ISSUE_TEMPLATE.md` next.

Tell me which of the above you'd like next and I'll add it directly to the repo content.
