# DJ's AstroPhotography

Live site: **https://djinlondon.github.io/Astrophotography/**

A free, simple website for sharing astrophotos. It's hosted on **GitHub Pages**.
Adding a photo works like this: drag it into the `photos` folder on github.com.
About a minute later it's on the site, with a thumbnail, a full-screen view,
and your equipment and exposure details.

**Cost: $0.** You don't need a server, a database or any software on your computer.
(Optional: your own domain name like `www.yourname-astro.com`, about $10–15/year.)

---

## One-time setup (about 10 minutes)

1. **Create a free GitHub account** at <https://github.com/signup> if you don't have one.
2. **Create the repository:** go to <https://github.com/new>.
   - Repository name: `astrophotography` (or anything you like; it becomes part of the web address)
   - Choose **Public** (free GitHub Pages sites have to be public)
   - Click **Create repository**
3. **Upload these files:** on the new empty repository page, click **"uploading an existing file"**.
   Unzip the project on your computer, then drag *everything inside* the `astro-gallery` folder
   into the browser window. That includes the hidden `.github` folder.
   Click **Commit changes**.
   > On a Mac, press **Cmd + Shift + .** in Finder to show hidden folders like `.github`.
   > If the `.github` folder won't upload, see *Troubleshooting* below.
4. **Turn on the website:** in the repository go to **Settings → Pages**. Under
   **Build and deployment → Source**, choose **GitHub Actions**.
5. **Publish for the first time:** go to the **Actions** tab, click **Publish website** on the left,
   then **Run workflow**. When the dot turns green (about a minute), your site is live at:

   **`https://YOUR-USERNAME.github.io/astrophotography/`**

6. **Site settings:** open `site.txt` in the repository and click the ✏️ pencil icon.
   You can change the title, the 🔭 icon, the **banner photo** across the top
   (the file name of any of your photos), the gallery heading, the order
   (`oldest first` / `newest first`), and add contact links or an About section.
   Then click **Commit changes**.

---

## Adding a photo (the everyday part)

1. In the repository, open the **`photos`** folder.
2. Click **Add file → Upload files** and drag in your image(s). Then click **Commit changes**.
3. Wait about a minute and refresh your website. That's it.

This works from a phone browser too.

**Optional, but nice:** add details for the photo. Make a text file with the **same name**
as the photo (`orion-nebula.jpg` → `orion-nebula.txt`). The easy way: in the `photos` folder
click **Add file → Create new file**, name it `orion-nebula.txt`, and paste in the contents of
[`TEMPLATE.txt`](TEMPLATE.txt):

```
Title: Orion Nebula (M42)
Date: 2026-01-15
Category: Nebula
Telescope: Redcat 51
Camera: ASI533MC Pro
Filters: L-eXtreme
Integration: 4h 30m (54 x 300s)
Location: Backyard, Bortle 6

The first clear night in three weeks! The Trapezium is completely blown out
in the core, but I love how much of the outer dust came through.
```

- **Title**: if you leave it out, the file name is used (`orion-nebula` → "Orion nebula").
- **Date**: `YYYY-MM-DD` (you can add a time, e.g. `2023-03-20 16:20`). It isn't shown on the
  site; it only decides the order (set in `site.txt`). Photos without a date go at the end. If you leave it out, the date
  saved in the image by your camera is used, if there is one.
- **Category**: anything you like, e.g. Nebula, Galaxy, Planet, Moon, Sun, Milky Way,
  Star Cluster. Filter buttons appear automatically.
- **Featured: yes** pins a photo to the top of the gallery and uses it as the preview
  image when you share your link in a text message or on social media.
- **Hidden: yes** takes a photo off the site without deleting it.
- **More photos: other-file.jpg** shows extra images on the same page instead of as separate
  cards. Separate several with commas. See `heart-and-soul-rgb-and-sho.txt` for an example.
- **Any other line** shaped like `Something: value` shows up in the details panel.
  For example: `Guiding: 0.6" RMS`, `Moon: 12% waxing`, `Software: PixInsight`.
- Everything after the first blank line is the description.

### Editing or removing a photo
- **Change details:** open the `.txt` file, click ✏️, edit, then **Commit changes**.
- **Remove a photo:** open the image file, click the **⋯** menu → **Delete file**, then **Commit changes**.
  Delete its `.txt` file too.

---

## Photo tips

- **Upload JPEGs** exported from your processing software (PixInsight, Siril, Photoshop, Lightroom…).
  PNG and TIFF work too, but JPEGs are smaller.
- **Keep each file under 25 MB**, which is GitHub's limit for uploading in the browser.
  A 6000-pixel-wide JPEG at quality 90–95 is usually 5–20 MB. That's perfect.
- You don't need to make small versions yourself. The site creates thumbnails and
  screen-sized copies automatically, so pages stay fast even on phones.
- **"Download full size"**: visitors can download your original upload. To turn
  this off, set `Allow downloads: no` in `site.txt`.
- **Room for photos:** GitHub suggests keeping a repository under about 1 GB.
  That's roughly 75–150 full-size JPEGs. If you get close, export at 4000 px wide instead.

---

## Optional extras

- **Your own domain name:** buy one from any registrar (Cloudflare, Porkbun and Namecheap are all
  inexpensive). Then follow GitHub's guide:
  <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>.
- **Preview on your computer before publishing** (needs Python installed):
  ```
  pip install -r requirements.txt
  python scripts/build.py
  python -m http.server -d _site 8000
  ```
  Then open <http://localhost:8000>.
- **GitHub Desktop** (<https://desktop.github.com>) is a free app. It lets you keep a copy of the
  repository on your computer and add photos by dragging them into a normal folder.
  Then click **Commit** and **Push**. Handy if you upload a lot at once.

---

## Troubleshooting

- **The site didn't update.** Check the **Actions** tab. A red ✗ means the build failed;
  click it to see why. The most common causes are a corrupt or unusual image file,
  or a `.txt` file name that doesn't match its photo.
  A bad image is skipped with a warning, so the rest of the site still publishes.
- **The `.github` folder didn't upload.** In the repository click **Add file → Create new file**
  and type `.github/workflows/publish.yml` as the name. Paste in the contents of that file
  from the zip, then click **Commit changes**.
- **404 page.** Make sure step 4 (Settings → Pages → Source: **GitHub Actions**) is done,
  and the workflow has run at least once.

## What's in here

| Path | What it is | Do you edit it? |
|---|---|---|
| `photos/` | Your images and their optional `.txt` details | **Yes, all the time** |
| `site.txt` | Site title, your name, the About text | Yes, occasionally |
| `TEMPLATE.txt` | Starter text for a photo's details | No, just copy it |
| `src/` | The website's design (HTML/CSS/JavaScript) | Only if you want to restyle it |
| `scripts/build.py` | Turns `photos/` into the website | No |
| `.github/workflows/publish.yml` | Runs the build and publishes on every change | No |
