mock67: a local mock of La Hoja Boricua's account backend, for screenshots of the signed-in screens
=====================================================================================================

Python standard library only. Nothing in the worktree is changed: every rewrite is done on the text
being served, never on disk.

START
-----
  python server.py C:\Users\Owner\lhb-65-wt\site 8767 --pidfile server.pid

  Options: --host 127.0.0.1 (default)   --no-img-rewrite (see "Profile photos" below)
  The server prints its process id and writes it to the --pidfile. It refuses to start (exit 2)
  if hoja.js no longer contains the two Clerk script URLs it rewrites.

STOP (by the recorded process id, never by name)
  PowerShell:  Stop-Process -Id (Get-Content server.pid)

FIRST STEP IN THE BROWSER: SEED THE SAVED ACCOUNT
-------------------------------------------------
Open this once per browser profile (use http://127.0.0.1:8767 or http://localhost:8767, and keep
using the same one, because profile photo URLs are built from the address you use):

  http://127.0.0.1:8767/__mock/seed?to=%23/mihoja/perfil

It sets, for this origin only:
  localStorage  vb_cuenta2 = {"sub":"user_demo","handle":"ana","name":"Ana R.",
                              "avatar":"http://127.0.0.1:8767/__clerkimg/av-ana.webp"}
                (the saved account; with it the top bar shows the avatar at once, on every page)
  sessionStorage vb_splash = "1"   (skips the bus splash animation in this tab)
and then opens /<to>. The avatar in vb_cuenta2 must start with <origin>/__clerkimg/ or the header
falls back to initials.

Start over (server data back to the seed, and this origin's localStorage and sessionStorage cleared):
  http://127.0.0.1:8767/__mock/reset?to=%23/mihoja/perfil

Wait about 3 seconds after each page opens before the screenshot: Mi Hoja checks the account
(GET /api/me) and the first sync (GET /api/mihoja) fills Mi Hoja and repaints the page.
Reading /__mock/state shows the server data as JSON.

SCREENS AND THEIR URLS (append to http://127.0.0.1:8767/)
---------------------------------------------------------
  Avatar header (top bar)        any page after seeding, e.g. /#/catalogo
                                 (the round photo at top right, element #topAvatar)
  Own profile (Perfil)           /#/mihoja/perfil   (same as /#/perfil): photo, name, @ana, bio,
                                 favorite brand, counts, Editar perfil, tabs Resenas/Pasaporte/
                                 Favoritos/Humidor, account panel
  Profile editor                 /#/mihoja/editar   (form filled with Ana's data and photo)
  People search with results     /#/mihoja/personas, then type  ma  in the search field
                                 (results: manu_rosa, mari_tabaco, pepe_jibaro); "carl" gives one
  Feed of followed people        /#/mihoja/siguiendo  (7 public tastings from 3 people)
  Profile with follow button     /#/u/carlos_humo   button shows "Siguiendo" (already followed)
                                 /#/u/manu_rosa     button shows "Seguir" (not followed)
  Lists with a button per row    /#/u/ana/seguidores   and   /#/u/ana/siguiendo
  Sync status line               /#/mihoja/humidor  (also /#/mihoja/diario, /pasaporte,
                                 /favoritos): bottom of the page, section Respaldo, the line
                                 with id syncSt, "sincronizada" with the date of the sync
  Badge row (Insignias)          /#/mihoja/pasaporte  section "Insignias": 4 of 8 earned
                                 (first stamp, 5 cigars, 5 artisans, 5 places) plus the
                                 6 Ruta zone badges (these stamps are not meant to complete a
                                 zone; not checked in a browser)
  Public profile in the app      /#/u/mari_tabaco  tab Pasaporte shows her stamp counts
  Public passport page (server)  /u/carlos_humo   (no #: server-rendered HTML, a Python port of
                                 functions/u/[handle].js renderPassport): photo, name, bio,
                                 favorite brand, tasting and stamp counts, tasting grid

  Note: no public page has a badge row. The real /u/<handle> and the in-app profile of another
  person show stamp COUNTS (sellos de artesanos, cigarros, lugares), not the Insignias row; the
  Insignias row exists only in the signed-in person's own Mi Hoja Pasaporte.

THE CAST
--------
  ana           Ana Rivera (you, user id user_demo)  follows carlos_humo, mari_tabaco, pepe_jibaro
  carlos_humo   Carlos Ortiz      followed by you
  mari_tabaco   Marisol Vega      followed by you
  pepe_jibaro   José Martínez     followed by you
  manu_rosa     Manuel Rosa       not followed
  andres_pr     Andrés Colón      not followed; follows you
  Photos are brand logos from site/img/logos, served at /__clerkimg/av-<name>.webp.
  Mi Hoja for ana: 3 humidor items, 4 tastings (3 public), 6+7+6 stamps, 3 favorites,
  dates relative to the day the server starts.

WHAT IS MOCKED
--------------
  hoja.js            the two Clerk script URLs become /__mock/clerk.js and /__mock/ui.js
                     (response header X-Mock-Rewrite says what was replaced)
  /__mock/clerk.js   window.Clerk: load(), user (id user_demo, Ana Rivera, username ana,
                     hasImage, imageUrl), session.getToken(), addListener(), openSignIn() (no-op),
                     signOut() (no-op: the mock stays signed in), user.setProfileImage() (uploads
                     to POST /__mock/avatar, kept in memory), user.reload(), user.update()
  /__mock/ui.js      window.__internal_ClerkUICtor, an empty class
  /api/me            GET: profile with identity, needsIdentity false (401 without a Bearer token)
  /api/profile       POST: 409 profile-exists. PUT with avatar_url: edits the profile (handle
                     taken, avatar not from /__clerkimg/, bad fields give the real error codes).
                     PUT without avatar_url: 409 identity-exists
  /api/handle        GET ?h=  available / taken / invalid
  /api/mihoja        GET {rev, schema, doc, updated_at}; PUT needs If-Match (428 without it,
                     409 conflict with the current copy on a stale rev, 200 {rev, updated_at})
  /api/feed          GET {items:[{author, entry}], next:null}
  /api/people        GET ?q= (2 to 40 characters), prefix match on @, first name, last name
  /api/follow        GET ?handle= (counts, self, viewerFollows), POST and DELETE {handle}
  /api/followers, /api/following   GET ?handle=
  /api/u/<handle>    GET {profile, counts:{resenas, followers, following, sellos}, resenas}
  /api/account       DELETE {confirm:"ana"}: 200 and the server data goes back to the seed;
                     any other confirm: 400 confirm-mismatch
  sw.js              replaced by a worker that clears this origin's caches and unregisters
                     itself, so a cached original hoja.js is never used here

PROFILE PHOTOS (one deliberate extra rewrite)
---------------------------------------------
The client shows a profile photo only when its URL starts with 'https://img.clerk.com/'
(app.js AV_HOST, cuenta.js CLERK_IMG, hoja.js CLERK_IMG_URL and PF_IMG). So, in the served copies
of app.js, cuenta.js and hoja.js, that literal is replaced by (location.origin+'/__clerkimg/') and
every avatar the mock hands out lives under /__clerkimg/. Start with --no-img-rewrite to serve
those files unchanged apart from the Clerk script URLs; photos then show as initials.

LIMITS
------
  Signing out and the onboarding (new profile) screens are not reachable: the mock is always
  signed in with a complete profile. Data lives in memory and resets on restart or /__mock/reset.
