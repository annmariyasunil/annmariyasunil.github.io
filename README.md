# annmariyasunil.github.io

Personal site built with [Quarto](https://quarto.org), hosted on GitHub Pages.

## One-time setup (about 30 minutes)

1. **Install Quarto**: download the installer for your laptop from https://quarto.org/docs/get-started/ and run it. In VS Code, also install the "Quarto" extension.
2. **Install Git** if `git --version` doesn't work in a terminal: https://git-scm.com/downloads
3. **Python for blog posts**: `pip install jupyter numpy matplotlib` (only needed for posts that run code).
4. **Create a GitHub account** at https://github.com. Pick your username carefully; it becomes your URL. Then create a new **public** repository named exactly `USERNAME.github.io`.
5. Unzip this folder, open a terminal inside it, and run:

   ```bash
   quarto preview          # opens the site in your browser and live-reloads as you edit
   ```

6. Before publishing, edit `_quarto.yml`: set `site-url` to `https://USERNAME.github.io` and add your GitHub link under `navbar: right`.
7. Publish:

   ```bash
   git init
   git add .
   git commit -m "First version of my site"
   git branch -M main
   git remote add origin https://github.com/USERNAME/USERNAME.github.io.git
   git push -u origin main
   quarto publish gh-pages
   ```

   The site goes live at `https://USERNAME.github.io` in a minute or two. If the address shows nothing, go to the repository's Settings > Pages and make sure the source is the `gh-pages` branch.

## Everyday use

- **Edit a page**: change the `.qmd` file, then run `quarto publish gh-pages` again.
- **CV PDF**: put your PDF at `files/Ann_Mariya_Sunil_CV.pdf` (the CV page links to it). Use a version **without your phone number**, since this site is public.
- **New blog post**: copy `writing/posts/dro-newsvendor/` to a new folder, rename it, and edit `index.qmd`. Posts with `draft: true` are not published.
- **Turning on the Writing tab**: once two posts are finished, remove `draft: true` from them and uncomment the `Writing` lines in `_quarto.yml`.

## Where things live

| File | What it is |
|---|---|
| `_quarto.yml` | Site settings, navbar, links |
| `styles.scss` | Colors, fonts, layout (palette is at the top) |
| `index.qmd` | Home page |
| `assets/network.js` | The interactive interdiction demo on the home page |
| `research.qmd`, `teaching.qmd`, `cv.qmd` | Inner pages |
| `writing/` | Blog listing and posts |

## Worth adding soon

- A real figure for each project on the Research page (an instance network, a solve-time plot, a cost comparison). Put the image in the project's section with `![caption](files/figure.png)`.
- Links to the paper or preprint and code for each project once they exist.
- Your YouTube channel link in the "Outside research" section of `index.qmd`.
- A custom domain (`annmariyasunil.com`, about $12/year), set under repository Settings > Pages.
