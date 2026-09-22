# Deploying Apex Solar CRM / ERP to GitHub & Custom Subdomain

This guide explains how to upload your repository to GitHub and publish the CRM on your custom subdomain (e.g. `crm.yourdomain.com.au` or `erp.yourdomain.com`).

---

## 1. Push Code to GitHub

A clean Git repository on branch `main` has already been initialized with all production configurations.

Run the following commands in your terminal:

```bash
# 1. Link to your GitHub repository (replace with your actual GitHub repo URL)
git remote add origin https://github.com/MMS-AUS/MySolarCRM.git

# 2. Push code to main branch
git push -u origin main
```

---

## 2. Setting Up GitHub Pages for Custom Subdomain

> ⚠️ **CRITICAL (Resolves `HttpError: Not Found` / `status: 404`):**
> GitHub requires repository owners to explicitly enable Pages once via the web UI.
>
> **Direct Link to your repo settings**: **https://github.com/MMS-AUS/MySolarCRM/settings/pages**
>
> 1. Open: **https://github.com/MMS-AUS/MySolarCRM/settings/pages**
> 2. Under **Build and deployment** -> **Source**: Click the dropdown and select **GitHub Actions** (NOT "Deploy from a branch").
> 3. (Optional) Under **Custom domain**:
>    - Enter your custom domain / subdomain (e.g. `crm.yourdomain.com.au`).
>    - Click **Save**.
>    - Check **Enforce HTTPS** once DNS resolves.
> 4. Go to the **Actions** tab on GitHub and click **"Re-run all jobs"** on the latest workflow run (or simply `git push`). It will now immediately deploy with green checkmarks!

---

## 3. DNS Configuration at Your Domain Registrar (GoDaddy / Namecheap / Cloudflare / cPanel)

Log in to where your DNS is managed and add the following CNAME record:

| Type  | Name / Host | Value / Target                              | TTL       |
|-------|-------------|---------------------------------------------|-----------|
| CNAME | `crm`       | `<YOUR_GITHUB_USERNAME>.github.io.`        | Automatic |

*(For example, if your GitHub username is `solarexpert`, point `crm` to `solarexpert.github.io`)*

---

## 4. Alternate Deployment Platforms (One-Click)

The codebase also includes native routing files for other modern hosting providers:
- **Cloudflare Pages**: Connect your GitHub repo, Framework preset `Vite`, Build command `npm run build`, Output directory `dist`. Add your custom domain under Custom Domains.
- **Vercel**: `vercel.json` is included with SPA rewrites (`/*` -> `/index.html`).
- **Netlify**: `public/_redirects` is included.
