<div align="center">

# 🏋️ Gym Test
### Gym Membership & Operations Management

[![GitHub](https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/4am7l/Gym-test)

**An Arabic-first, mobile-friendly system for managing gym members, subscriptions, payments, and attendance.**

</div>

---

## Overview

Gym Test helps gym staff manage daily operations in one place. It includes an administrator dashboard and a separate member portal, with cloud-hosted APIs and persistent membership records.

**Deployment:** Configure an independent Cloudflare Pages project for this test repository.

## Features

### Administration
- Add, search, edit, and manage gym members.
- Track active, expiring, expired, and future subscriptions.
- Create subscriptions and renew memberships, with renewal history.
- Record payments, review balances, and inspect payment history.
- Register attendance and review attendance records.
- View administrative activity logs.
- Export member and subscription records to CSV or JSON.
- Select multiple members for bulk management.

### Member Portal
- Look up personal membership details using the registered phone number.
- Check subscription dates and current status.
- View available bodybuilding workout programs.
- Access the gym's displayed payment information.

### Experience
- Responsive Arabic RTL interface for phones and desktops.
- Light and dark themes.
- Progressive Web App (PWA) manifest for installation on supported devices.
- Subscription status calculations aligned with Jordan's time zone.

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript |
| Hosting | Cloudflare Pages |
| Serverless API | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| Version control & deployment | GitHub + Cloudflare integration |
| Installable web experience | Web App Manifest / Service Worker |

## Architecture

```text
Browser / Installed Web App
           |
     Cloudflare Pages
           |
  Cloudflare Pages Functions
           |
   Cloudflare D1 (SQLite)
```

## Repository Layout

```text
Gym-test/
├── public/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── gym-operations.js
│   ├── payment-config.json
│   ├── manifest.webmanifest
│   ├── sw.js
├── functions/
│   ├── api/
│   └── lib/
├── docs/
├── PICS/
├── supabase/               # Legacy migration files
├── server.js               # Legacy Express implementation
├── package.json
└── README.md
```

> Some legacy Node.js/Express and Supabase files remain in the repository. The current deployed application uses Cloudflare Pages, Pages Functions, and D1.

## Deployment

This test application can be deployed independently from GitHub to Cloudflare Pages. Pushing a commit to the connected branch triggers a new deployment.

For a new Cloudflare deployment:
1. Connect this GitHub repository to a Cloudflare Pages project.
2. Configure the site's static assets and Pages Functions.
3. Create a Cloudflare D1 database and configure the binding expected by the Functions code.
4. Apply the database schema/migrations required by the application.
5. Set required secrets in Cloudflare project settings; never commit secrets.
6. Deploy and verify the member and admin workflows.

Database bindings and environment settings must match the deployed Functions implementation.

## Security Notes

- Keep database credentials, session secrets, and admin passwords out of public source control.
- Use HTTPS and restrict administrative operations to authenticated sessions.
- Phone-number lookup alone is not strong member authentication. Avoid exposing sensitive information through that flow.
- Maintain backups and review database access controls.

## Developer

Built and maintained by [4am7l](https://github.com/4am7l).

<div align="center">

**Gym Test — Train Hard. Manage Smart.**

Made in Jordan 🇯🇴

</div>
