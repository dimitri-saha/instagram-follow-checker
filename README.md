# Instagram Unfollowers

A minimal web app that compares your Instagram following vs followers from your exported data and lists users who don’t follow you back, with direct links to their profiles. All processing happens locally in your browser.

## How to export your Instagram data (Followers and Following only)

Web
- Open Accounts Center → Download your information: https://accountscenter.instagram.com/info_and_permissions/dyi
- Choose “Some of your information”
- Under Categories, select only “Followers and following”
- Set format to JSON, then create file
- When you receive the email/notification, download the ZIP and upload it to the app

Mobile app
- Profile → menu → Settings and privacy
- Accounts Center → Your information and permissions
- Download your information → Some of your information
- Select only “Followers and following”, format JSON
- Create file, wait for notification, download the ZIP

## Development

Install and run locally:
```bash
npm install
npm run dev
```

Build production:
```bash
npm run build
```

## Deploy

### GitHub Pages
```bash
npm install
npm run deploy
```
Enable Pages: Repository → Settings → Pages → Source: `gh-pages` branch  
Site URL: `https://<your-username>.github.io/instagram-follow-checker/`

### Vercel
- Import this GitHub repo into Vercel
- Build command: `npm run build`
- Output directory: `dist`
