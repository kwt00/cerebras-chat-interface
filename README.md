# Cerebras-Powered Chat Application

A sleek chat UI inspired by Vercel's AI SDK, powered by Cerebras models via OpenRouter.

---

## 🧰 Prerequisites
- **Node.js** v18+
- **npm** (comes with Node.js)

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

---

## 🔑 Usage

1. On first launch, you’ll be prompted to enter your Cerebras API key. (You can get one from [OpenRouter](https://openrouter.ai/) or your Cerebras provider.)
2. Start chatting! Messages stream live from the Cerebras model.

---

## 🛠️ Project Structure
- `app/api-key/page.tsx` — API key input page
- `app/chat/page.tsx` — Main chat interface
- `components/ChatMessage.tsx` — Chat message bubble
- `app/api/chat/route.ts` — Backend chat API route

---

## 🌐 Deployment
Deploy easily to Vercel:
```bash
npm install -g vercel
vercel
```

Set your API key as an environment variable in the Vercel dashboard if you want server-side access.

---

## 📚 Resources
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Cerebras Developer Docs](https://www.cerebras.net/developers/)
- [OpenRouter API Docs](https://openrouter.ai/docs)

---

Feel free to customize and expand this app for your needs!
