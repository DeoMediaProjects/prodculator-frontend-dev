Prodculator Backend Implementation Proposal


Executive Summary

Prodculator currently operates as a frontend-only application that communicates directly with third-party services (managed database, OpenAI, Stripe) from the user's browser. While this allowed for rapid prototyping, it introduces critical security vulnerabilities and architectural limitations that must be resolved before serving real users and processing payments.

This proposal outlines the implementation of a dedicated backend server to sit between the frontend and all external services, resolving security issues, improving reliability, and enabling features that are not possible with a browser-only architecture.


Why This Is Needed

1. API Key Exposure (Critical Security Risk)

The OpenAI API key is currently embedded in the frontend JavaScript bundle via the VITE_OPENAI_API_KEY environment variable. Any user can open browser DevTools, inspect the network tab or source code, and extract this key. This means:

- Anyone can make unlimited OpenAI API calls on our account, generating costs with no control
- The key cannot be rotated without redeploying the frontend and hoping no one cached it
- This is a billing liability — a leaked key could generate thousands of dollars in charges overnight

A backend server keeps the OpenAI key server-side, where it is never sent to the browser.

2. Admin Permissions Are Not Enforced

The current admin permission system (master admin, senior admin, data admin, support admin) is implemented entirely in React context on the frontend. This means:

- Any user can bypass admin restrictions by modifying JavaScript in the browser console
- There is no server-side verification that a user making an admin action is actually an admin
- Data integrity cannot be guaranteed — a malicious user could modify incentive data, crew costs, or user records

A backend server enforces permissions on every request before touching the database.

3. Payment Security

Stripe webhook handling currently runs through backend functions with limited error handling. The backend will:

- Verify Stripe webhook signatures properly to prevent spoofed payment events
- Ensure subscription state is always consistent with Stripe's records
- Prevent users from bypassing payment gates to generate reports they haven't paid for

4. Script Confidentiality

Users upload scripts — potentially unreleased, commercially sensitive intellectual property. Currently, script content is sent directly from the browser to OpenAI. A backend server:

- Keeps script content on our infrastructure before forwarding to OpenAI
- Enables server-side logging and audit trails of what was processed
- Allows us to add encryption at rest for stored scripts

5. PDF Generation Reliability

PDF reports are currently generated in the browser using window.print(), which produces inconsistent results across browsers and devices. Server-side PDF generation produces identical, professional-quality output every time.

6. Foundation for Scale

A backend server enables capabilities that are impossible with a browser-only architecture:

- Background processing — script analysis takes 30–120 seconds; users shouldn't stare at a loading spinner
- Email notifications — automatically notify users when their report is ready
- Rate limiting — prevent abuse of free report generation
- API access for B2B clients — enterprise clients can integrate programmatically
- Analytics and monitoring — server-side logging of all operations


Technical Approach

- Language: Python
- Framework: FastAPI (modern, high-performance, automatic API documentation)
- Database: managed database (Postgres) — no database migration needed, existing schema is preserved
- Deployment: Separate service alongside the existing frontend
- Authentication: All auth flows route through the backend; frontend never touches the database directly

The existing 13 database tables remain unchanged. The backend sits between the frontend and all external services (managed database, OpenAI, Stripe, Brevo).


4-Week Delivery Schedule


Week 1: Foundation + Core Authentication

Deliverables:

| 1.1 | Project scaffolding      | Backend project structure, dependency management, environment configuration, health check endpoint   
| 1.2 | Authentication API       | User signup, signin, signout, password reset — all routed through the backend with server-side validation
| 1.3 | Admin authentication     | Admin signin with server-side role verification (master, senior, data, support admin)               
| 1.4 | Background task system   | Infrastructure for long-running operations (script analysis, report generation) with status polling 

End of Week 1 milestone: A user can sign up, log in, and manage their session entirely through the backend. Admin roles are verified server-side. No API keys are exposed in the frontend.


Week 2: Script Analysis + Report Generation

Deliverables:

| 2.1 | Script upload            | Secure file upload endpoint with validation (file type, size limits) and server-side storage         
| 2.2 | Script analysis          | OpenAI integration running server-side — API key never exposed to the browser                       
| 2.3 | Report generation engine | Territory scoring algorithm, B2C and B2B report assembly — ported from frontend to backend          
| 2.4 | Report API               | Create, list, view, and share reports; poll generation status                                       
| 2.5 | Server-side PDF generation | Professional-quality PDF reports generated on the server, consistent across all devices            

End of Week 2 milestone: A user can upload a script, trigger AI analysis, and receive a generated report with a downloadable PDF — all processed server-side.


Week 3: Payments + Email Notifications + Data Endpoints

Deliverables:

| 3.1 | Stripe payment integration | Checkout sessions, subscription management, and customer portal — all server-side                 
| 3.2 | Stripe webhook handling  | Secure webhook receiver with signature verification for payment events                              
| 3.3 | Email notifications      | Automated emails for: welcome, report ready, payment confirmation, processing started, grant alerts 
| 3.4 | Data endpoints           | Grants, festivals, territory watchlist, subscription status — all served through the backend         
| 3.5 | Subscription enforcement | Server-side checks for report limits, free report gating, and plan-based access control             

End of Week 3 milestone: The full user journey works end-to-end through the backend — signup, payment, script upload, analysis, report generation, PDF download, and email notifications.


Week 4: Admin Panel + Frontend Migration + Testing + Deployment

Deliverables:

| 4.1 | Admin API with server-side permissions | All admin CRUD operations (incentives, crew costs, comparables, grants, festivals) enforced server-side
| 4.2 | Business metrics API     | Admin dashboard metrics (total users, active subscriptions, MRR, conversion rate, reports this month)
| 4.3 | Production signals API   | Production intelligence tracking and trend analytics for the admin dashboard                        
| 4.4 | Frontend migration       | Replace all direct managed database/OpenAI calls with backend API calls; remove exposed keys from frontend  
| 4.5 | Integration testing      | End-to-end tests covering auth, report generation, payments, and admin operations                   
| 4.6 | Deployment configuration | Dockerized backend ready for deployment; updated frontend deployment config                         

End of Week 4 milestone: The frontend no longer communicates with any external service directly. All API keys are server-side only. Admin permissions are enforced. The system is tested and deployment-ready.


Risk Mitigation

Risk | Mitigation                                                              

| Backend introduces a new point of failure | Health check monitoring; the frontend gracefully handles API errors with user-friendly messages             |
| Migration breaks existing functionality | Backend is built and tested in parallel; frontend switches over only when the backend is verified            |
| OpenAI analysis takes too long          | Background task system with status polling; users are notified by email when reports are ready               |
| Increased hosting costs                 | Backend is lightweight (Python/FastAPI); estimated $10–25/month on Railway or Render for initial scale       |


What Doesn't Change

- Database schema — all 13 existing tables remain as-is
- Frontend UI/UX — no visual changes; users won't notice the migration
- managed database — continues to serve as the Postgres database and file storage
- Stripe pricing — same plans, same prices, same checkout flow


Expected Outcomes

After implementation:

1. No API keys exposed in the browser — OpenAI, Stripe secret key, Brevo all server-side only
2. Admin actions verified on every request — permission bypass is no longer possible
3. Consistent PDF output — professional reports regardless of user's browser or device
4. Background processing — users don't wait for 2-minute analysis; they get an email when it's done
5. Webhook reliability — payment state is always consistent; no missed or spoofed events
6. B2B API readiness — enterprise clients can integrate via documented API endpoints
7. Audit trail — server-side logging of all operations for compliance and debugging
