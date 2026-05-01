# Private Beta

JANO is configured as a closed private beta.

## Access Rules

- Public signup is disabled.
- `/login` and `/blocked` are the only public frontend pages.
- All application routes redirect to `/login` without a valid session.
- Users with `isBeta = false` are sent to `/blocked`.
- All `/api/**` routes require JWT authentication except:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`

## User Model

Required user fields:

- `email`
- `passwordHash`
- `role`: `USER` or `ADMIN`
- `isBeta`: must be `true` to access the app

`isBeta` defaults to `false`, so newly inserted users are blocked until
explicitly enabled.

## Creating Users Manually

Use Prisma Studio through the internal SSH tunnel flow:

```bash
docker compose -f infra/docker-compose.yml exec backend npm run studio
ssh -L 5555:localhost:5555 user@server
```

Open:

```text
http://localhost:5555
```

Create or edit a `User`:

- Set `email`.
- Set `passwordHash` to a bcrypt hash.
- Set `role`.
- Set `isBeta = true`.

Generate a bcrypt hash inside the backend container:

```bash
docker compose -f infra/docker-compose.yml exec backend node -e "const bcrypt=require('bcrypt'); bcrypt.hash(process.argv[1],10).then(console.log)" 'plain-password'
```

## Login UI Customization

Login layout file:

```text
frontend/src/app/features/auth/login/login.component.html
```

Login visual styles:

```text
frontend/src/app/features/auth/login/login.component.scss
```

Main tokens are defined at the top of `.beta-auth-page`:

```scss
--auth-bg
--auth-panel
--auth-text
--auth-muted
--auth-border
--auth-accent
--auth-error
--auth-radius
--auth-spacing
```

Change colors by editing those variables. Change typography by adjusting
`.beta-auth-card__header h1`, `.beta-auth-field`, and `.beta-auth-submit`.
Change spacing by editing `--auth-spacing`, card padding, and form gap.

To add a logo:

1. Put the asset under `frontend/public/assets`.
2. Add an `<img>` near `.beta-auth-card__brand` in `login.component.html`.
3. Style it in `login.component.scss`.

To add a background image:

1. Put the image under `frontend/public/assets`.
2. Add it to `.beta-auth-page` background before or after the gradient.

For a more premium direction, keep the current centered card structure and
iterate on:

- stronger brand mark
- higher quality background image or editorial artwork crop
- refined type scale
- subtle border and shadow treatment
- one clear primary action
