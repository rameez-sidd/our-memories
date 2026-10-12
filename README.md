# Our Little Library — React edition

Private photo wall built with React + Vite. Supabase provides login and photo metadata; Cloudinary stores the photos.

## Why Cloudinary

Cloudinary handles direct browser upload and delivery. This intentionally simple setup needs no Vercel and no backend server.

## One-time setup

1. Run `npm install`, then `npm run dev` and open the local URL Vite shows. No Vercel account or deployment is needed.
2. Create a Supabase project. In **SQL Editor**, run `supabase-setup.sql` after replacing the example emails. In **Authentication → Users**, create exactly two email/password users—one for each of you. In **Authentication → Providers**, keep Email enabled and turn off “Confirm email” if you want setup to avoid even the initial confirmation message. The app uses password sign-in only; it never sends magic links.
3. Create a Cloudinary account. In **Settings → Upload → Upload presets**, create an **unsigned** preset, restrict it to image formats, and copy its name plus your Cloud name.
4. Copy `.env.example` to `.env.local` and fill in the values. Restart `npm run dev` after editing `.env.local`.
