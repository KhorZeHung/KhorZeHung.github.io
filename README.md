# khorzehung.github.io

Personal portfolio of **Khor Ze Hung**, Full Stack Developer.
Live at **https://khorzehung.github.io**

Plain HTML, CSS and JavaScript. No build step, no dependencies to install.

## Structure

```
index.html            Single page: hero, about, skills, experience, projects, contact
css/style.css         All styles (theme tokens at the top, dark by default)
js/main.js            Theme toggle, mobile menu, scroll reveal, active nav, copy email
assets/               Profile photo, project images, resume PDF, favicon, OG image
robots.txt, sitemap.xml
```

## Run locally

```bash
python -m http.server 5500
```

Then open http://localhost:5500.

## Common edits

- **Colors**: change the `--accent` tokens at the top of `css/style.css` (dark and light blocks).
- **Case study links**: the KYC and reporting cards use `href="#"` with the `js-placeholder` class.
  Replace the `href` with a real URL and remove the class.
- **Resume**: replace `assets/Khor-Ze-Hung-Resume.pdf` (keep the filename, or update the two links in `index.html`).
