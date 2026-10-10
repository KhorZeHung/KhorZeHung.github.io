# khorzehung.github.io

Personal portfolio of **Khor Ze Hung**, Full Stack Developer.
Live at **https://khorzehung.github.io**

Plain HTML, CSS and JavaScript. No build step, no dependencies to install.

## Structure

```
index.html            Single page: hero, about, skills, experience, contact
css/style.css         All styles (theme tokens at the top, dark by default)
js/main.js            Theme toggle, mobile menu, active nav, copy email
assets/               Profile photo, tech logo sprite, resume PDF, favicon, OG image
robots.txt, sitemap.xml
```

## Run locally

```bash
python -m http.server 5500
```

Then open http://localhost:5500.

## Common edits

- **Colors**: change the `--accent` tokens at the top of `css/style.css` (dark and light blocks).
- **Tech logos**: brand marks live in `assets/tech-icons.svg` (from [Simple Icons](https://simpleicons.org), CC0).
  Use one with `<svg class="tech__logo" style="--c:#HEX" fill="currentColor"><use href="assets/tech-icons.svg#slug" /></svg>`.
  Omit `--c` for monochrome brands so they follow the theme text color.
- **Projects**: there is a `<!-- Projects: to be added later -->` marker in `index.html` between Experience and Contact.
  Add a `<section id="projects">` there and a matching `<a href="#projects">` in the nav.
- **Resume**: replace `assets/Khor-Ze-Hung-Resume.pdf` (keep the filename, or update the two links in `index.html`).
