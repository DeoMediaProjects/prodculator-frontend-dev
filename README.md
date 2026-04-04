# Prodculator - Professional Film Production Intelligence Platform

**Live Site:** https://app.prodculator.com

Prodculator is a professional platform for film producers to upload scripts and receive investor-ready intelligence reports covering production location strategy, tax incentives, crew costs, and comparable productions.

## 🌍 Supported Territories

- United Kingdom
- United States
- Canada
- Australia
- New Zealand
- Malta
-Italy

## 🚀 Features

### Core Platform
- **Scripteligence AI Analysis** - Upload scripts, receive comprehensive production reports
- **Territory Comparison Tool** - Compare filming locations side-by-side
- **What-If Calculator** - Budget scenario planning
- **Tax Incentive Database** - Up-to-date incentive information
- **Grant & Funding Opportunities** - Partnership with Grantify
- **Film Festival Tracking** - Comprehensive festival database
- **B2B Client Management System** - Enterprise solutions

### User Types
- **Free Users** - Sample report access
- **Paid Users** - Full report generation ($71/$57 per report)
- **Studio Plan** - Unlimited reports ($299/$239/month)
- **B2B Enterprise** - Custom solutions

### Payment Processing
- **Dual-Currency Stripe Integration**
  - GBP for UK users
  - USD for all other users
- Automatic currency detection based on user location

## 🛠️ Tech Stack

### Frontend
- **React** + **TypeScript**
- **Material-UI** (MUI) - Component library
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Navigation

### Backend
- **managed database** - Database & Authentication
- **Stripe** - Payment processing
- **OpenAI** - Script analysis (Scripteligence)
- **AWS S3** - File storage (scripts, PDFs)

### Deployment
- **Vercel** - Application hosting
- **Bluehost** - Main website (www.prodculator.com)
- **DNS** - Managed through Bluehost

## 📁 Project Structure

```
prodculator/
├── src/
│   ├── app/
│   │   ├── components/      # React components
│   │   │   ├── admin/       # Admin dashboard
│   │   │   ├── auth/        # Login/signup
│   │   │   ├── user/        # User-facing components
│   │   │   └── common/      # Shared components
│   │   ├── contexts/        # React contexts (Auth, Script)
│   │   ├── pages/           # Static pages (FAQ, Terms, etc.)
│   │   └── App.tsx          # Main app component
│   ├── services/            # Backend services
│   │   ├── auth.service.ts
│   │   ├── database.service.ts
│   │   ├── api.ts
│   │   ├── stripe.service.ts
│   │   └── script-analysis.service.ts
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   └── styles/              # Global styles
├── public/                  # Static assets
├── vercel.json             # Vercel configuration
└── package.json            # Dependencies
```

## 🔧 Environment Variables

Required environment variables (set in Vercel):

```env
# App / backend routing
VITE_API_BASE_URL=https://api.your-backend-domain.com

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...

# Optional frontend-only keys
VITE_GOOGLE_MAPS_API_KEY=...
VITE_TMDB_API_KEY=...
```

## 🚀 Local Development

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prodculator.git
   cd prodculator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local` file**
   ```bash
   cp .env.example .env.local
   ```
   Then add your environment variables

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:5173
   ```

## 📦 Deployment

### Vercel (Production)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Add environment variables** in Vercel dashboard

4. **Configure custom domain** (app.prodculator.com)

### Environment Variables in Vercel

Go to: Vercel Dashboard → Project Settings → Environment Variables

Add all variables from `.env.local`

## 🗄️ Database Setup

### managed database Schema

The platform uses the following main tables:
- `users` - User accounts
- `subscriptions` - Stripe subscriptions
- `reports` - Generated production reports
- `email_gating_log` - Abuse prevention
- `tax_incentives` - Territory incentive data
- `grants` - Funding opportunities
- `festivals` - Film festival database
- `crew_costs` - Territory crew cost data
- `comparable_productions` - Similar productions database

### Running Migrations

```bash
# Apply migrations
your_backend_db_cli db push

# Reset database (dev only)
your_backend_db_cli db reset
```

## 💳 Stripe Integration

### Webhooks

Configure Stripe webhook endpoint:
```
https://app.prodculator.com/api/stripe-webhook
```

Events to listen for:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 🎨 Brand Guidelines

### Colors
- **Primary:** Gold (#D4AF37)
- **Secondary:** Black (#000000)
- **Accent:** White (#FFFFFF)

### Typography
- **Headings:** Playfair Display (serif)
- **Body:** Inter (sans-serif)

## 📊 SEO Optimization

**Target Markets:**
- United States film production
- United Kingdom film production

**Keywords:**
- Film production location strategy
- Tax incentives for filmmakers
- Script analysis for producers
- Production budget planning
- Film funding opportunities

## 🔐 Security

- Environment variables never committed to Git
- database row-level security (RLS) enabled
- Stripe webhook signature verification
- Rate limiting on API endpoints
- Email gating for abuse prevention

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

For support, email: support@prodculator.com

---

**Built with ❤️ for Film Producers**

Version: 6.8.1  
Last Updated: January 29, 2026
