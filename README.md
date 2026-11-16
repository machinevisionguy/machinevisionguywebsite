# Machine Vision Guy

Static website for machinevisionguy.com. Plain HTML, CSS, and a little JavaScript. No build step, no framework.

## Structure

```
index.html        Home (site intro hero, search + category filter, article grid)
about.html        About page
contact.html      Contact page (email form)
articles/         One HTML file per post
  do-i-need-ai-machine-vision.html
assets/
  style.css       Shared styling. Brand colors are the tokens at the top (:root)
  app.js          Mobile nav, category filter, contact form
  logo.svg        Logo mark (swap this file to change the logo)
  articles/       Images and charts used in posts
```

## Deploy to Hostinger from GitHub (recommended)

One-time setup. After this, every push to GitHub updates the live site.

1. Put this folder in a GitHub repository.
2. In Hostinger hPanel, open your website Dashboard, then Advanced, then Git.
3. Connect GitHub, authorize the repository, set the deploy directory to `public_html`, branch `main`.
4. Deploy. The first deployment needs `public_html` empty, so clear WordPress first (after a backup), or deploy to the free test subdomain, confirm, then point the domain.
5. Auto deployment is on by default. From then on, `git push` updates the live site.

### Create the repo (first time)

```
cd site
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/machinevisionguy.git
git push -u origin main
```

## Contact form (one setup step)

The form emails you with a success notice, with no backend, using Web3Forms (free).

1. Go to web3forms.com, enter `machinevisionguy@gmail.com`, and get your free Access Key.
2. In `contact.html`, replace `YOUR_WEB3FORMS_ACCESS_KEY` with that key.

Submissions then arrive at machinevisionguy@gmail.com, and the visitor sees a success message. Until the key is set, the form shows an error that points to your email, which is also listed on the page as a fallback.

## Add a new article

1. Copy `articles/do-i-need-ai-machine-vision.html` to a new file, for example `articles/what-is-machine-vision.html`.
2. Change the title, meta description, the `<h1>`, the date and tags in the meta line, and the body.
3. On `index.html`, add a card in the grid pointing to the new file, with the right `data-category` and title.
4. Commit and push (or upload).

Or send the draft to Claude and get the finished article file plus its home-page card back.

### Category values

A card's `data-category` must match a filter button's `data-filter` on `index.html`. A card can carry several, comma separated.

| Label | data-filter |
|---|---|
| Vision Strategy & Standards | strategy |
| AI | ai |
| Automated Inspection | inspection |
| Vision-Guided Robotics (Physical AI) | vgr |
| Traceability | traceability |
| Measurement | measurement |

## Change colors or logo

- Colors: edit the tokens in `:root` at the top of `assets/style.css` (the A3-mirrored palette).
- Logo: replace `assets/logo.svg`, or edit the `MV` mark and name in each page header.

## Notes

- The header is sticky, and the nav collapses to a dropdown on tablet and mobile.
- The category filter and search run in the browser, so they work on static hosting with no backend.
