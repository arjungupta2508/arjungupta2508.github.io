# Arjun Gupta, portfolio

A modular Jekyll site for GitHub Pages. Content lives in `_data/`; layout lives in `_includes/`.

## Publish

1. Create a repo named `YOUR-USERNAME.github.io` on GitHub and push these files to `main`.
2. In the repo, open Settings, then Pages, and set the source to "Deploy from a branch" with branch `main` and folder `/ (root)`.
3. In `_config.yml`, set `url` to `https://YOUR-USERNAME.github.io`.
4. In `_data/profile.yml`, set `github` to your username. The GitHub links stay hidden until you do.

If the repo has any other name, set `baseurl: "/repo-name"` in `_config.yml`.

## Edit content

| To change | Edit |
| --- | --- |
| Name, headline, email | `_data/profile.yml` |
| Featured paper, metrics, links | `_data/publications.yml` |
| Projects (add a `url` to link a repo) | `_data/projects.yml` |
| Education and experience | `_data/background.yml` |
| Awards | `_data/achievements.yml` |
| Section order and nav links | `_data/sections.yml` |

## Add a section

1. Create `_includes/my-section.html` (copy `projects.html` as a starting point).
2. Add `- id: my-section` and a `label` to `_data/sections.yml`.

## Change the look

Colors, radii and fonts are CSS variables at the top of `assets/css/main.css`. Dark mode values are in the two dark blocks right below. The hero graphic reads `--cm0`, `--cm1`, `--cm2` for its color scale.

## Run locally

    bundle install
    bundle exec jekyll serve

Then open http://localhost:4000.
