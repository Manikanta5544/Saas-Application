# Multi-Tenant SaaS Notes Application

A production-ready multi-tenant SaaS application built with React, TypeScript, Supabase, and Vercel. This application demonstrates secure tenant isolation, role-based access control, and subscription management.

## 🚀 Features

### Core Functionality
- ✅ Multi-tenant architecture with secure data isolation
- ✅ JWT authentication with predefined test accounts
- ✅ Role-based access control (Admin/Member)
- ✅ Complete Notes CRUD operations
- ✅ Subscription management with real-time limit enforcement
- ✅ Health check endpoint for monitoring

### Subscription Plans
- **Free Plan:** Maximum 3 notes per tenant
- **Pro Plan:** Unlimited notes
- **Upgrade:** Admin-only access via API endpoint
- **Enforcement:** Real-time limit checking with immediate effect after upgrade

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build tooling

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security
- **Vercel Serverless Functions** for API endpoints

### Deployment
- **Vercel** for both frontend and API hosting
- **Environment variables** for configuration
- **CORS** enabled for external API access

## 🤝 Contributing

This is a production-ready SaaS application built for demonstration purposes. The codebase follows best practices for maintainability, security, and scalability.
