# Overview

KOMARCE is a unified e-commerce and loyalty ecosystem focused on sustainability. The platform connects customers, merchants, and administrators in a marketplace where every transaction contributes to environmental goals while earning reward points. Users can shop for products, earn loyalty points, and participate in a reward system that promotes sustainable practices.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui for consistent design system
- **Styling**: Tailwind CSS with CSS variables for theming support
- **Build Tool**: Vite for fast development and optimized builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Session Management**: PostgreSQL-based session storage using connect-pg-simple
- **API Design**: RESTful endpoints with role-based authorization middleware
- **File Structure**: Modular route handlers with centralized storage interface

## Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless for scalability
- **Schema**: Comprehensive schema covering users, products, orders, reviews, and loyalty system
- **Migrations**: Drizzle Kit for database schema migrations and management

## Authentication & Authorization
- **Multi-role System**: Support for customer, merchant, and admin roles
- **JWT Implementation**: Stateless authentication with role-based access control
- **Middleware Protection**: Route-level authorization based on user roles
- **Password Security**: bcrypt hashing with secure password policies

## Core Business Logic
- **Multi-country Support**: Built-in support for BD, MY, AE, and PH markets
- **Loyalty System**: Point-based rewards with tier progression and reward numbers
- **E-commerce Features**: Complete shopping cart, wishlist, and order management
- **Product Management**: Category-based organization with brand associations
- **Review System**: Customer feedback and rating system for products

## Development Workflow
- **Monorepo Structure**: Shared schema and types between client and server
- **Hot Reload**: Vite development server with Express integration
- **Type Safety**: End-to-end TypeScript with shared type definitions
- **Error Handling**: Centralized error handling with user-friendly messages

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production scalability
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL adapter

## UI/UX Libraries
- **Radix UI**: Unstyled, accessible component primitives for building design system
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Lucide React**: Modern icon library with consistent design language

## Development Tools
- **Vite**: Fast build tool with Hot Module Replacement for development
- **TanStack Query**: Powerful data fetching and caching library
- **React Hook Form**: Performant forms library with validation support
- **Zod**: Schema validation library for runtime type checking

## Authentication & Security
- **bcryptjs**: Password hashing library for secure user authentication
- **jsonwebtoken**: JWT implementation for stateless authentication
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Date & Utility Libraries
- **date-fns**: Modern date utility library for date manipulation
- **clsx & tailwind-merge**: Utility functions for conditional CSS classes
- **class-variance-authority**: Type-safe component variant management