# 🛡️ Cyber Crime Reporting Portal – AI-Powered Fraud Response

> National Cyber Crime Reporting Platform with integrated AI-powered real-time fraud incident response for India.
> Built for the **Golden Hour** – the critical 2-hour window when funds can still be frozen.

---

## 🚀 Features

- **🤖 5-Agent AI Orchestration**: Intent Discovery → Router → File Complaint / Retrieval / Fallback
- **📸 Multimodal Input**: Upload UPI screenshots, PDF bank statements, or type freely
- **⚡ Golden Hour Detection**: Automatic urgency when fraud < 2 hours old
- **📋 Instant Complaint Filing**: Auto-generates Cyber Crime Number (CCN)
- **☑️ Status Retrieval**: Check complaint status with OTP verification
- **🌐 Hindi/English Bilingual**: Natural language in either language
- **🔒 Encrypted & Confidential**: End-to-end protection for sensitive data

---

## 🎯 What You Can Do

| Action | How It Works |
|--------|-------------|
| 🚨 **Report UPI Fraud** | Upload screenshot or describe the transaction. AI extracts transaction ID, amount, receiver VPA, time. Files complaint instantly if all details present. |
| 📄 **Analyze Bank Statement** | Upload PDF or image. Extracts any visible transaction/payment information. |
| ⚡ **Golden Hour Alert** | If fraud < 2 hours old: Flags as URGENT, guides immediate complaint filing. Funds may still be freezable! |
| 🎫 **Instant CCN** | Generate Cyber Crime Number automatically: CCN-2026-XXXXXX |
| ☑️ **Track Complaint** | Ask "Check my complaint status" → OTP verification → View all filed complaints with real status updates |
| 🛒 **Consumer Disputes** | Guide for e-commerce, defective products, non-delivery → Consumer Protection Act resources |
| 📞 **24x7 Human Support** | Connects to National Cyber Helpline: **1930** (free, always available) |

---

## 🏗️ Architecture

```
User Input (Text / Screenshot / PDF)
    ↓
┌─────────────────────────────────┐
│  Intent Discovery Agent (IDA)   │ ← GPT-4o Vision + NLP
│ Extracts: UTR, Amount, VPA, etc │   Confidence scoring
└──────────────┬──────────────────┘
               ↓
       ┌───────────────┐
       │ Router Agent  │ ← Confidence-based decision
       └───────────────┘
               ├─────────────────┬──────────────────┬─────────────┐
               ↓                 ↓                  ↓             ↓
        ┌───────────┐    ┌──────────┐     ┌──────────┐     ┌─────────┐
        │   File    │    │Retrieval │     │ Fallback │     │   IDA   │
        │ Complaint │    │  Agent   │     │  Agent   │     │ (IDA→)  │
        └─────┬─────┘    └────┬─────┘     └──────────┘     └─────────┘
              ↓                ↓
         CCN Generated    Complaint
                          Status List
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** 18+ (https://nodejs.org)
- **OpenAI API Key** with GPT-4o access (https://platform.openai.com/api-keys)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/rakshak-ai.git
cd rakshak-ai
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-...your-key-here...
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) – you should see the RakshakAI chat interface.

---

## 🌐 Deploy to Vercel (Production)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial RakshakAI setup"
git remote add origin https://github.com/YOUR_USERNAME/rakshak-ai.git
git push -u origin main
```

### Step 2: Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Click **Import Git Repository**
3. Select your `rakshak-ai` repository
4. Framework Preset will auto-detect as **Next.js** ✅

### Step 3: Add Environment Variable

In the Vercel project settings:
1. Go to **Settings → Environment Variables**
2. Add: `OPENAI_API_KEY` → paste your key
3. Make sure it applies to **Production**, **Preview**, and **Development**

### Step 4: Deploy

Click **Deploy** – Vercel will build and deploy in ~2 minutes.
Your URL will be: `https://rakshak-ai-[hash].vercel.app`

### Step 5: Custom Domain (Optional)

In Vercel → **Settings → Domains** → Add your custom domain.

---

## 📁 Project Structure

```
rakshak-ai/
├── app/
│   ├── page.tsx              # Chat UI (Next.js client component)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Tailwind + custom styles
│   └── api/chat/route.ts     # Orchestration endpoint
├── lib/agents/
│   ├── ida.ts                # Intent Discovery (multimodal)
│   ├── router.ts             # Routing logic
│   ├── fileComplaint.ts      # Complaint filing + CCN generation
│   ├── retrieval.ts          # Status lookup
│   └── fallback.ts           # Guided recovery
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── vercel.json
└── README.md
```

---

## 🔌 API Endpoints

### POST `/api/chat`

Send a message (with optional file) and receive orchestrated agent response.

**Request** (multipart/form-data):
```json
{
  "message": "I transferred 45000 to a wrong UPI and lost it",
  "sessionId": "uuid",
  "history": "[{\"role\":\"user\",\"content\":\"...\"}]",
  "file": <binary image/pdf>
}
```

**Response**:
```json
{
  "message": "Full agent response",
  "metadata": {
    "agent": "File Complaint",
    "priority": "URGENT",
    "ccn": "CCN-2026-456789",
    "goldenHour": true,
    "route": "FILE_COMPLAINT_AGENT"
  }
}
```

---

## 🧠 Agent Details

### 1. **Intent Discovery Agent (IDA)**
- **Role**: First point of contact. Analyzes text, images, PDFs.
- **Output**: Structured extraction of fraud details + conversational reply.
- **Model**: GPT-4o (vision-capable)
- **Confidence Scoring**: Only routes if confident > 55%

**Extracts**:
- `utr_or_transaction_id` – Transaction reference
- `amount_stolen` – Amount in INR
- `destination_vpa_or_account` – Receiver UPI/bank account
- `payment_platform` – GPay, PhonePe, Paytm, NEFT, etc.
- `time_since_fraud_minutes` – Minutes since fraud occurred
- `user_phone` – User's phone number
- `golden_hour_active` – True if < 120 minutes

### 2. **Router Agent**
- **Role**: Decides which agent handles the request.
- **Logic**:
  - FILE_COMPLAINT_AGENT: Intent=FILE_COMPLAINT + all mandatory fields
  - RETRIEVAL_AGENT: Intent=CHECK_STATUS
  - FALLBACK_AGENT: Low confidence or ambiguous
  - IDA (loop): Need more context

### 3. **File Complaint Agent**
- **Role**: Files cybercrime complaint instantly.
- **Process**:
  1. Check if all 5 mandatory fields present
  2. If Golden Hour active: Flag URGENT
  3. Generate CCN: CCN-{YEAR}-{6DIGITS}
  4. Show summary card + next steps (call 1930, dispute in UPI app, etc.)
  5. If fields missing: Ask for most critical one only (UTR > amount > VPA)

### 4. **Retrieval Agent**
- **Role**: Check complaint status securely.
- **Process**:
  1. Ask for registered phone number
  2. Send OTP (simulated – accepts any 4-6 digits)
  3. Display list of filed complaints
  4. Show detailed info when user selects a complaint

### 5. **Fallback Agent**
- **Role**: Handle unclear/ambiguous requests with empathy.
- **Process**:
  1. Acknowledge with warmth
  2. Offer 4 options (Report / Check Status / E-commerce / Call 1930)
  3. Ask one simple clarifying question
  4. **Mental Health Check**: If extreme distress → surface iCall (9152987821) + Vandrevala Foundation (1860-2662-345)

---

## 🛠️ Configuration Files

### `package.json`
Includes production dependencies: `next`, `react`, `react-dom`, `openai`, `lucide-react`, `uuid`

### `tsconfig.json`
Strict TypeScript with path aliases (`@/*`).

### `tailwind.config.js`
Tailwind v3 with dark mode (bg-gray-950, text-gray-100, etc.)

### `next.config.js`
Standard Next.js 14 config with SWC minification.

### `vercel.json`
Vercel-specific: buildCommand, devCommand, installCommand, framework, nodeVersion.

---

## 🌍 Emergency Resources

| Resource | Contact |
|----------|---------|
| **National Cyber Helpline** | **1930** (24x7, free) |
| **Cyber Crime Portal** | cybercrime.gov.in |
| **National Consumer Helpline** | **1800-11-4000** (24x7, free) |
| **iCall Mental Health** | **9152987821** (free counseling) |
| **Vandrevala Foundation** | **1860-2662-345** (24x7) |

---

## ⚖️ Disclaimer

**RakshakAI is built for educational and hackathon purposes.**

The complaint filing workflow is **simulated** – for a real complaint, visit [cybercrime.gov.in](https://cybercrime.gov.in) or call **1930**.

---

## 👨‍💻 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: describe your change"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

## 📄 License

MIT License – feel free to use, modify, and distribute.

---

## ❤️ Built with ❤️ for Safer Digital India

**RakshakAI** is committed to empowering fraud victims and building a safer digital India. Every feature is designed with empathy, speed, and real-world impact.

If you find this helpful, please star ⭐ and share!

---

**Last Updated**: August 2026  
**Maintainer**: RakshakAI Team
