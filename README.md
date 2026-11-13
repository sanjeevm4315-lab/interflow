# InternFlow — Internship Tracker

A browser-first internship application tracker built for the VibeSprint challenge.

## Run locally

1. Install Node.js (LTS).
2. Open this folder in VS Code.
3. Open Terminal and run:

```bash
npm install
npm run dev
```

4. Open the local URL printed by Vite (usually http://localhost:5173).

## Build

```bash
npm run build
```

The production website is generated in `dist/`.

## Deploy to Netlify

1. Push this folder to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Select the repository.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Deploy.

A `netlify.toml` file is included with these settings.

## Features

- Create, edit and delete internship applications.
- Track Applied, Test, Interview, Offer and Rejected statuses.
- Upcoming deadline panel.
- Warning badges for deadlines due within 3 days or overdue.
- Needs action filter.
- Pipeline summary that updates when a status changes.
- Search, deadline sorting and CSV export.
- Responsive dashboard.
- Local browser persistence using localStorage.

## Important challenge note

The published challenge brief currently says not to use database setup, login providers, external APIs or `.env` dependencies. This version therefore uses localStorage and fictional starter data. Re-check the locked minute-40 constraint with event leads before changing the architecture.

## Demo flow for judges

1. Click **Add application**.
2. Enter a fictional company and role.
3. Set the deadline to tomorrow (or within 3 days).
4. Save and point out the **Needs action** warning.
5. Click **Needs action** in the sidebar or the filter button.
6. Change the new record's status using its status dropdown.
7. Show the pipeline count changing immediately.
8. Edit the record, then demonstrate delete if requested.

## Data

Starter companies and all starter records are fictional demo data. New records are saved only in the current browser profile.
