# MoHL

Mobile growth learning platform: courses, a marketplace of tools, resources and a community.

## Run it

```bash
ruby server.rb
```

Then open http://localhost:5173. No installs needed — it uses the Ruby that ships with macOS.

## Online preview

Every push to `main` publishes the site to GitHub Pages
(`.github/workflows/pages.yml`): **https://yosefsoliman-mohl.github.io/mohl/**

Pages has no server, so the site runs in **preview mode** (`mohl/preview-backend.js`):
same content, sign-up, roles and admin, but everything a visitor does is saved only in
their own browser. Use `ruby server.rb` for the real, shared version.

## How it works

- `mohl/` — the web app (HTML, CSS, JavaScript).
- `server.rb` — the backend: accounts, content and community API.
- `seed.json` — starting content, copied into the database on first run.
- `data/db.json` — the database (created automatically). Delete it to start over.

## Accounts and roles

**The first account you create becomes the admin.** Everyone who signs up after that is a Member.
In **Admin → Members** admins can **Add member** (name, email, password and role), change anyone's
role from the dropdown, or remove a member.

| Role | Tools, courses, videos, resources | Community questions & replies (manage) | Members & roles | Post & reply |
|---|---|---|---|---|
| Admin | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | – | – | ✓ |
| Moderator | – | ✓ | – | ✓ |
| Member | – | – | – | ✓ |
| Viewer | – | – | – | – (view only) |

Permissions are enforced by the server (`AREAS` in `server.rb`); the app hides what a role can't use.
Videos: paste a YouTube, Vimeo or direct `.mp4` link into a lesson or a tool.

Saved items and lesson progress stay in each visitor's browser — nothing is tracked on the server.
