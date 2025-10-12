# E-Nakshatra: Enterprise Agency Management & Compliance Portal for Axis Bank

![Axis Bank Logo](https://raw.githubusercontent.com/atharva20-coder/nakshatra/main/public/logo.jpg)

## 1. Introduction

**E-Nakshatra** is a full-stack, enterprise-grade web application conceived, designed, and developed from scratch to digitize and centralize the management of third-party agencies for **Axis Bank**, India's third-largest private sector bank. Initiated and built by me in my capacity as an Assistant Manager, this project directly addresses the operational inefficiencies and compliance risks inherent in the bank's manual agency oversight processes.

This portal serves as a single source of truth, creating a transparent, accountable, and efficient ecosystem for the bank's internal teams (Administrators, Auditors) and its external agency partners (Agency Staff, Collection Managers). It is a testament to applying modern web technologies to solve complex, real-world challenges in the highly regulated banking sector.

## 2. The Business Problem & Its Impact

Prior to E-Nakshatra, the oversight of hundreds of third-party agencies responsible for services like debt collection and customer verification was a fragmented and manually intensive process. This presented several critical business challenges for Axis Bank:

* **High Compliance & Audit Risk:** Manually tracking adherence to the bank's strict code of conduct and regulatory guidelines was error-prone. A single compliance failure could lead to significant regulatory penalties and reputational damage.
* **Operational Inefficiency:** Key processes were managed through spreadsheets, emails, and physical documents. This led to data silos, duplication of effort, and a lack of real-time visibility, costing the bank significant man-hours.
* **Lack of Centralized Data:** Information was scattered across various departments, making it nearly impossible to get a holistic view of an agency's performance, compliance status, or operational health. This hampered strategic decision-making.
* **Poor Accountability:** Without a clear, auditable trail of interactions and submissions, enforcing accountability for compliance lapses or operational failures was difficult and often subjective.

## 3. The Solution: A Centralized Digital Ecosystem

E-Nakshatra replaces the legacy manual system with a secure, intuitive, and role-based digital portal. The platform digitizes the entire lifecycle of agency compliance and reporting.

### How It Helped The Bank:

* **Drastically Reduced Compliance Risk:** By mandating digital submissions through a structured, auditable platform, E-Nakshatra ensures that all required compliance activities are tracked, verified, and reported in real-time. This provides a robust defense against regulatory scrutiny.
* **Increased Operational Efficiency by over 40% (Projected):** Automating form submissions, report generation, and user management is projected to save thousands of man-hours annually, allowing bank employees to focus on higher-value strategic tasks rather than administrative paperwork.
* **Enabled Data-Driven Governance:** For the first time, Axis Bank has a centralized repository of all agency data. This allows for the creation of powerful analytics dashboards to monitor key performance indicators (KPIs), identify high-risk agencies, and make informed governance decisions.
* **Fostered Transparency and Accountability:** Every action on the platform is logged and timestamped. This creates an immutable audit trail, ensuring that both bank employees and agency partners are held accountable for their responsibilities.

## 4. Key Features

The platform is equipped with a comprehensive suite of features tailored to the needs of the banking environment.

* **Secure Authentication & Role-Based Access Control (RBAC):**
    * Multiple authentication methods: **Email/Password**, **Google OAuth**, and **Magic Links**.
    * Strict, permission-based roles: **ADMIN**, **AUDITOR**, **USER**, and **COLLECTION_MANAGER**.
    * Secure password hashing using the industry-standard **Argon2** algorithm.
    * Automated email verification and secure password reset functionality.
* **Comprehensive Form Management:**
    * A suite of **14+ digital forms** covering all critical compliance and operational areas (e.g., Code of Conduct, Asset Management, Agency Visits).
    * Ability for users to **save forms as drafts** and continue later.
    * A formal **submission and approval workflow**.
    * Centralized viewing and management of all submissions for Admins and Auditors.
* **User & Agency Dashboards:**
    * An intuitive dashboard for agency users to track their pending tasks, form statuses, and submission deadlines.
    * A powerful **Admin Panel** for comprehensive user management, role assignment, and system oversight.
    * Detailed user profiles showing personal information and a complete history of their form submissions.
* **Modern & Responsive User Experience:**
    * A clean, professional, and fully responsive UI built with **Tailwind CSS** and **shadcn/ui**.
    * Interactive tables for data entry and real-time feedback through toast notifications.

## 5. Technical Deep Dive & Architecture

E-Nakshatra is built on a modern, robust, and scalable technology stack, chosen specifically to meet the security and performance demands of a financial institution.

### Tech Stack

| Category | Technology | Rationale & Implementation Details |
| :--- | :--- | :--- |
| **Core Framework** | [**Next.js 14+**](https://nextjs.org/) (App Router) | The App Router's architecture with Server Components and Server Actions was leveraged to create a highly performant and secure application. This minimizes client-side JavaScript and allows sensitive data fetching and mutations to happen securely on the server, a critical requirement for a banking application. |
| **Language** | [**TypeScript**](https://www.typescriptlang.org/) | End-to-end type safety was a primary goal. TypeScript, used across the entire stack, ensures that data models (from Prisma), API handlers (Server Actions), and UI components are all in sync, drastically reducing runtime errors. |
| **Database & ORM** | [**PostgreSQL**](https://www.postgresql.org/) & [**Prisma**](https://www.prisma.io/) | PostgreSQL was chosen for its proven reliability and robustness. Prisma provides a type-safe database client generated directly from the `schema.prisma` file. This schema-first approach ensures database integrity and makes data access predictable and secure. All database models are defined in `prisma/schema.prisma`. |
| **Authentication** | [**Better Auth**](https://www.google.com/search?q=https://better-auth.dev/) & [**Argon2**](https://en.wikipedia.org/wiki/Argon2) | Better Auth was implemented for its comprehensive feature set, including role-based access control (RBAC), which is central to the application's security model (`src/lib/permissions.ts`). Passwords are securely hashed using Argon2, the winner of the Password Hashing Competition, via `@node-rs/argon2`. |
| **UI & Styling** | [**Tailwind CSS**](https://tailwindcss.com/) & [**shadcn/ui**](https://ui.shadcn.com/) | A professional and consistent UI was achieved using Tailwind CSS for utility-first styling and `shadcn/ui` for its library of beautifully designed, accessible, and composable React components. This allowed for rapid development of a polished user interface. |
| **Backend Logic** | [**Next.js Server Actions**](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) | Instead of traditional REST APIs, all backend mutations are handled via Server Actions (`src/actions/*.ts`). This simplifies the architecture, improves security by default (no exposed API endpoints), and leverages Next.js's integrated data flow. |
| **Email Service** | [**Nodemailer**](https://nodemailer.com/) | Used for critical email communications, such as sending account verification links and password reset instructions, ensuring a secure and reliable user lifecycle management process (`src/actions/send-email.action.ts`). |

### System Architecture

The application follows a monolithic architecture facilitated by Next.js, which simplifies development and deployment.

1.  **Client-Side (Browser):** The UI is rendered using React components. User interactions, such as filling out a form, trigger calls to Server Actions.
2.  **Server-Side (Next.js):**
    * **Server Actions (`/src/actions`):** These are the backbone of the application's backend logic. When a user submits a form, the corresponding Server Action is invoked.
    * **Authentication & Authorization:** The action first verifies the user's session and role using the `better-auth` library. Unauthorized requests are rejected immediately.
    * **Data Validation:** The incoming form data is validated.
    * **Database Interaction:** Validated data is then passed to the Prisma client, which performs the necessary database operations (create, update, delete).
    * **Revalidation:** Upon successful mutation, Next.js's `revalidatePath` function is called to update the cache and reflect the changes on the UI.
3.  **Database (PostgreSQL):** The database stores all application data, including users, sessions, and form submissions. The schema is defined and managed by Prisma.

This architecture is not only secure and performant but also highly scalable, capable of handling the demands of a large banking environment.

### Project Structure

The project follows the standard Next.js App Router structure, with a clear separation of concerns.

### Project Structure

The project follows the standard Next.js App Router structure, with a clear separation of concerns.

/src
├── /actions/         # Server Actions for all backend logic
├── /app/             # Next.js App Router pages and layouts
│   ├── /admin/       # Admin-only routes
│   ├── /api/         # API routes (used by Better Auth)
│   ├── /auth/        # Authentication pages (login, register)
│   ├── /forms/       # Dynamic routes for form creation and editing
│   └── ...
├── /components/      # Reusable React components
│   ├── /forms/       # Components for each of the 14+ forms
│   └── /ui/          # UI primitives from shadcn/ui
├── /lib/             # Core libraries and utilities
│   ├── auth.ts       # Better Auth configuration
│   ├── prisma.ts     # Prisma client instantiation
│   └── permissions.ts# Role-based access control definitions
└── /prisma/
    └── schema.prisma # The single source of truth for the database schema



## 6. Project Setup & Installation

Follow these steps to set up the project locally for development.

### Prerequisites

* Node.js (v18.18.0 or later)
* pnpm, npm, or yarn
* A PostgreSQL database

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/atharva20-coder/nakshatra.git](https://github.com/atharva20-coder/nakshatra.git)
    cd nakshatra
    ```
2.  **Install dependencies:**
    ```bash
    pnpm install
    # or
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables. Replace the placeholder values with your actual credentials.
    ```env
    # Database URL (from your PostgreSQL provider like Neon or Supabase)
    DATABASE_URL="postgresql://user:password@host:port/database"

    # Google OAuth Credentials
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"

    # Nodemailer Credentials (for sending emails)
    NODEMAILER_USER="your_email@gmail.com"
    NODEMAILER_APP_PASSWORD="your_gmail_app_password"

    # Admin Email (semicolon-separated list for initial admin users)
    ADMIN_EMAIL="admin1@example.com;admin2@axisbank.com"
    ```
4.  **Push the database schema:**
    This command will sync your Prisma schema with your PostgreSQL database, creating all the necessary tables and relations.
    ```bash
    npx prisma db push
    ```
5.  **Generate Prisma Client:**
    This step is usually handled automatically by the `dev` script, but you can run it manually.
    ```bash
    npx prisma generate
    ```
6.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application will be available at `http://localhost:3000`.

## 7. About the Author

This project was single-handedly designed, developed, and architected by me, **Atharva Joshi**, during my tenure as an **Assistant Manager** at Axis Bank. It represents a significant initiative to bridge the gap between business needs and technological solutions within the bank.

My work on E-Nakshatra demonstrates a comprehensive skill set encompassing problem analysis, system design, full-stack development, and a deep understanding of enterprise requirements. I am confident that this project showcases my readiness and potential to excel in a Master's program and contribute meaningfully to the field of software engineering.
