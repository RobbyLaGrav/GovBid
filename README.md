# GovBid Pro - AI-Powered Government Contract Bidding Platform

<div align="center">

![GovBid Pro Logo](docs/assets/logo.png)

**Revolutionizing Government Contracting with AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 🚀 Overview

GovBid Pro is a comprehensive, production-ready SaaS platform that helps contractors and businesses discover, track, manage, and bid on government and commercial contracts. Our AI-powered system automates the entire bidding process from discovery to proposal submission, including document generation, Bill of Materials (BOM) creation, and bid strategy recommendations.

## ✨ Key Features

### 🔍 Contract Discovery & Aggregation
- Real-time contract scraping from SAM.gov, state/local portals, and commercial platforms
- AI-powered contract matching based on business profiles
- Advanced filtering by industry, value, location, set-asides, and deadlines
- Support for all industries and contract types

### 🤖 AI-Powered Bid Compilation
- Automated proposal generation using Claude AI
- Intelligent form filling for all government paperwork
- Bill of Materials (BOM) generator with 3 pricing tiers:
  - **Aggressive**: Competitive low-ball pricing
  - **Competitive**: Market-rate balanced approach
  - **Premium**: Higher margins for quality positioning
- Compliance checking and requirement verification

### 📊 Dashboard & Analytics
- Visual contract pipeline with 6 status stages
- Real-time performance metrics and win rate tracking
- Revenue projections based on bid pipeline
- Competitive intelligence and market analysis
- Customizable reports and data exports

### 📅 Calendar & Project Management
- Integrated deadline tracking with multiple calendar views
- Automated reminders (7-day, 3-day, 1-day)
- Google Calendar and Outlook integration
- Project timeline and Gantt chart generation

### 👥 Collaboration & Team Features
- Multi-user accounts with role-based permissions
- Internal commenting and review workflows
- Version control for proposals
- Approval workflows before submission
- Shared template library

### 📈 Past Performance Management
- Portfolio management with photo galleries
- AI-powered smart matching to solicitation requirements
- Client references and contact tracking
- Automated inclusion in proposals

### 🔔 Notifications & Alerts
- Real-time alerts for new matching contracts
- Deadline reminders and amendment notifications
- Award announcements and Q&A deadline alerts
- Personalized daily/weekly opportunity digests

### 💳 Subscription Management
- Tiered subscription plans (Starter, Professional, Enterprise)
- Stripe integration for secure payments
- Usage tracking and billing management

## 🏗️ Architecture

```
govbid-pro/
├── frontend/          # React + TypeScript + Redux
├── backend/           # Node.js + Express + Prisma
├── ai-services/       # Python-based AI/ML services
├── scrapers/          # Contract aggregation services
├── shared/            # Shared types and utilities
├── database/          # Database schemas and migrations
├── infrastructure/    # Docker, K8s, Terraform configs
└── docs/              # Documentation
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Redux Toolkit for state management
- Material-UI (MUI) for components
- Recharts & D3.js for analytics
- FullCalendar for scheduling

**Backend:**
- Node.js 20 LTS
- Express.js with TypeScript
- Prisma ORM
- PostgreSQL, Redis, MongoDB, Elasticsearch
- Bull for job queues

**AI/ML:**
- Anthropic Claude API (Primary)
- OpenAI GPT-4 (Fallback)
- LangChain for document processing
- Vector databases for embeddings

**Infrastructure:**
- Docker & Docker Compose
- GitHub Actions for CI/CD
- Railway/AWS for hosting
- Sentry for monitoring

## 🚦 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/govbid-pro.git
cd govbid-pro
```

2. **Install dependencies**
```bash
# Install root dependencies
pnpm install

# Install frontend dependencies
cd frontend
pnpm install

# Install backend dependencies
cd ../backend
pnpm install
```

3. **Set up environment variables**
```bash
# Copy example env files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Edit .env files with your credentials
```

4. **Set up the database**
```bash
cd backend
pnpm prisma migrate dev
pnpm prisma db seed
```

5. **Start the development servers**
```bash
# In the root directory
pnpm dev

# Or start individually:
# Frontend (in frontend/)
pnpm dev

# Backend (in backend/)
pnpm dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

### Docker Setup (Alternative)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 Documentation

- [Architecture Overview](docs/architecture/system-design.md)
- [API Documentation](docs/api/openapi.yaml)
- [Database Schema](docs/architecture/database-schema.md)
- [Deployment Guide](docs/deployment/deployment-guide.md)
- [User Guide](docs/user-guides/getting-started.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🗺️ Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅
- [x] Project structure and setup
- [x] Authentication system
- [x] Database schema
- [x] Basic API infrastructure

### Phase 2: Contract Discovery (Weeks 3-4) 🚧
- [ ] SAM.gov API integration
- [ ] Contract scraping services
- [ ] Search and filter functionality
- [ ] Contract detail pages

### Phase 3: User Profiles (Week 5)
- [ ] Business profile management
- [ ] Certifications and capabilities
- [ ] Past performance portfolio

### Phase 4: AI Bid Compilation (Weeks 6-8)
- [ ] Claude API integration
- [ ] Document analysis
- [ ] Proposal generation
- [ ] BOM generator with 3-tier pricing

### Phase 5: Calendar & PM (Week 9)
- [ ] Calendar views and management
- [ ] Deadline tracking
- [ ] External calendar integration

### Phase 6: Analytics (Week 10)
- [ ] Performance dashboards
- [ ] Reporting suite
- [ ] Business intelligence

### Phase 7: Collaboration (Week 11)
- [ ] Team management
- [ ] Approval workflows
- [ ] Real-time collaboration

### Phase 8: Notifications (Week 12)
- [ ] Alert system
- [ ] Email notifications
- [ ] Push notifications

### Phase 9: Payments (Week 13)
- [ ] Stripe integration
- [ ] Subscription management
- [ ] Billing system

### Phase 10: Advanced Features (Weeks 14-15)
- [ ] AI Bid Coach
- [ ] Competitive intelligence
- [ ] Contract performance tracking

### Phase 11: Launch (Week 16)
- [ ] Testing suite
- [ ] CI/CD pipeline
- [ ] Production deployment

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Anthropic Claude for AI capabilities
- SAM.gov for government contract data
- All our contributors and supporters

## 📞 Support

- 📧 Email: support@govbidpro.com
- 💬 Discord: [Join our community](https://discord.gg/govbidpro)
- 📖 Docs: [docs.govbidpro.com](https://docs.govbidpro.com)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/govbid-pro/issues)

---

<div align="center">

**Built with ❤️ by the GovBid Pro Team**

[Website](https://govbidpro.com) • [Documentation](https://docs.govbidpro.com) • [Blog](https://blog.govbidpro.com)

</div>
