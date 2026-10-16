# UI design reference

Halloween dos Freitas is an annual party website for guests registering their
attendance, voting on costumes, viewing published results, and browsing photos.
Administrators manage events and participants through a separate dashboard.
This document is the visual reference for the rebuild. Recommendations are
identified explicitly; they do not imply that the current application already
implements them.

The [product](docs/product.md), [lifecycle](docs/lifecycle.md),
[architecture](docs/architecture.md), and [data model](docs/data-model.md)
documents define behavior and privacy. For setup and deployment, see
[Operations](docs/operations.md). Preserve the existing homepage section layout
and visual identity while implementing those contracts.

## Identity and content

The public experience is playful and theatrical: dark surfaces, oversized
Halloween emoji, decorative headings, and bright accents. Photos and participant
names become the focus during voting and after the party. The dashboard uses
denser layouts and smaller controls for administrative tasks.

The document language is `pt-BR`. Public copy uses friendly Brazilian Portuguese,
including labels such as “Votar agora”, “Galeria de Fotos”, and “Voltar ao início”.
Keep operational messages direct: explain whether an action is available, what
happened, and how to continue. Some existing dashboard labels are English;
Portuguese is the recommended default for new interface copy.

Display event dates in the event's IANA timezone and format public dates using
`pt-BR`. Event details and availability follow the selected annual edition
rather than assume a fixed year. Keep attendance RSVP, contestant entry, and the
contestant photo gallery visually distinct from the party photo album; see the
product and lifecycle documents for their access and publication rules.

## Visual language

### Color

The application stays dark regardless of system color preference. Global CSS
defines `--background: #000000` and `--foreground: #ffffff`; most additional
colors are Tailwind utilities applied directly to components. There is no
central semantic palette beyond the background and foreground variables.

| Role                  | Existing utilities                                  | Usage                                                    |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Base                  | `bg-black`, `text-white`                            | Page canvas and primary text                             |
| Raised surfaces       | `bg-stone-900`, `bg-zinc-800`                       | Information cards, registration section, candidate cards |
| Transparent surfaces  | `bg-white/10`, `bg-black/30`, `bg-black/50`         | Dashboard panels, status panels, countdown blocks        |
| Primary accent        | `bg-orange-500`, `bg-orange-400`, `text-orange-400` | Actions, selected event, highlights, footer              |
| Category accent       | `bg-purple-600`                                     | Voting and results category tiles, photo captions        |
| Supporting accent     | `text-green-400`, `bg-green-600`                    | Event details, active status, result publication         |
| Administrative action | `bg-blue-600`                                       | Upload and save controls                                 |
| Unavailable state     | `bg-gray-700`, `bg-gray-400`, reduced opacity       | Disabled actions and completed voting categories         |
| Error                 | `text-red-400`, `text-red-500`                      | Dashboard validation and form errors                     |

Orange buttons often use black text, but some existing controls use white.
Reuse the surrounding feature's established treatment; check text contrast when
adding or changing combinations. Color alone should not convey availability,
selection, or an error.

### Typography

Fonts are configured in [util/fonts.ts](util/fonts.ts): Poppins is loaded at
weight 400 for the body, and Metal Mania at weight 400 for decorative headings.
The root layout applies Poppins through its generated class. Global CSS also
contains an Arial/Helvetica fallback stack and assigns Metal Mania to `h1`;
other themed headings apply the secondary font class explicitly. Bold utilities
are used even though additional font weights are not currently loaded.

The hero uses `text-7xl` and grows to `text-9xl` at `lg`. Homepage section
headings commonly use `text-6xl` to `text-8xl`; internal page headings generally
use `text-4xl` to `text-7xl`. Body text grows to `text-xl` or `text-2xl` in several
desktop sections. Dashboard labels and helper text use smaller sizes.

Use decorative typography for identity and major headings. Keep form inputs,
participant names, explanatory copy, and dense administrative content readable.

### Layout and surfaces

Layouts use Tailwind spacing utilities, typically `gap-4`, `gap-8`, and
`gap-16`, with section padding around `p-8` or `py-16`. Content widths vary by
task: registration uses `max-w-sm`, voting grids `max-w-3xl`, results details
`max-w-4xl`, the dashboard `max-w-5xl`, and homepage sections `max-w-7xl`.

Cards usually have `rounded-2xl` corners; buttons and inputs use `rounded-lg`,
`rounded-xl`, or `rounded-2xl`. Borders are restrained, often orange on public
inputs or translucent white on dashboard controls. Shadows are used on floating
actions and photo cards rather than every surface.

The homepage alternates black, stone, and zinc sections. At `lg`, several inner
sections shift upward with negative positioning to overlap the preceding
section. Preserve enough room for large headings and avoid clipping this overlap.

### Imagery and motion

The hero uses [public/hero-video.mp4](public/hero-video.mp4) as a muted,
autoplaying, looping, inline video with `object-cover`. Emoji provide the party's
visual motifs: pumpkin, ghost, bat, skull, trophy, and camera. Preserve the footer's
video attribution when changing the hero presentation.

Participant images use Cloudinary. Candidate and gallery thumbnails crop with
`object-cover`; the gallery dialog uses `object-contain` to show the full image.
Candidate cards fall back to the Cloudinary asset
`halloween-freitas/apple-icon_fqkaye` when a participant has no photo.

Existing motion includes a spinning loader, hover transitions, smooth scrolling,
and a slight scale increase on selected candidates. Reduced-motion alternatives
and a way to pause or replace the background video are recommended improvements;
they are not currently implemented.

## Screens and journeys

| Screen                     | Purpose and layout                                                                     | Important states                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/`                        | Hero, countdown, party information, program, registration, footer                      | Pre-event, registration upcoming/open/closed, voting soon/open/ended, post-event       |
| `/votacao`                 | Verified Google/email-code access for registered guests                                | Entering, rejected email or connection error, voting unavailable                       |
| `/votacao/categories`      | Category tiles with guest greeting                                                     | Available category, already voted, guest session unavailable                           |
| `/votacao/categories/[id]` | Candidate search, selectable photo grid, floating vote action                          | No matches, selected candidate, submitting, vote success or failure                    |
| `/meu-halloween?eventId=…` | Linked guest portal for one selected edition                                           | RSVP/profile, owned entries/statuses, photo upload/replacement and voting state        |
| `/perfil?eventId=...`      | Selected-edition RSVP confirmation and editable guest name                             | Loading, denied/unlinked, validation, saving, saved, archived edition                  |
| `/resultados`              | Published category tiles and event navigation                                          | Published results, no published results                                                |
| `/resultados/[id]`         | Prominent first place and remaining ranked participants                                | Vote counts and percentages, category with no votes                                    |
| `/fotos`                   | Contestant photo gallery with event navigation, search, and viewer                     | No photos or matches, selected photo                                                   |
| `/album-da-festa`          | Published party-photo album with annual archive selection                              | Waiting for publication, empty published album, selected photo                         |
| `/dashboard`               | Admin overview with event KPIs, readiness checklist, milestone, and valid next actions | No edition, selected active or archived edition, lifecycle phases, metrics unavailable |
| `/dashboard/convidados`    | Selected-edition guest management                                                      | Guest list and editing, archived-edition inspection                                    |
| `/dashboard/concursos`     | Selected-edition contest categories, entries, and enrollment status                    | Loading, empty, error, enrollment open/closed/frozen, archived edition                 |
| `/dashboard/votacao`       | Voting controls and results publication                                                | Manual voting state, publication, archived-edition inspection                          |
| `/dashboard/galeria`       | Selected-edition party album management                                                | Album publication and photos, separate from contestant images                          |
| `/dashboard/configuracoes` | Event schedule, settings, category settings, annual edition creation                   | Selected edition, validation, active or archived state                                 |

### Homepage and registration

Before the event starts, show event information, the program, and the registration
section. The countdown appears when an event start is available and the initial
homepage state is pre-event. Show the attendance RSVP form when its scheduled
start has passed and the edition remains before its permanent first-voting
cutoff; otherwise show the relevant opening or closed state. RSVP availability
remains independent of whether contestant entry is open. Preserve the existing
section layout while communicating these states.

Registration asks for full name and email and explains that each adult needs a
separate email. During submission, disable the inputs and action and show
“Enviando...”. Success resets the form and leaves a persistent “Presença confirmada!” panel; duplicate registration,
server rejection, and connection failure produce error toasts.
The selected-edition registration section also links guests to their profile;
the page requires a verified sign-in linked to an RSVP for that edition.

At the event start, keep event information, the program, and the RSVP status
visible so the persistent navigation's section links remain useful. Follow them
with a centered lifecycle panel for “Votação em breve”, “Votação aberta”, or
“Votação encerrada”. Only the open state offers an active link to vote. First
opening voting also ends new RSVP and contestant membership changes permanently,
while previously registered guests can still authenticate. The lifecycle area
reflects server-backed state and retains its established visual treatment.

Published results after voting ends, an archived event, or no current event show
the post-event cards linking to results and photos. Those links do not bypass
results publication checks.

### Persistent feature navigation

At wide desktop widths, keep a centered pill sticky to the top of the viewport
and overlay it on the homepage hero so no empty background band precedes the
image. Use a glossy translucent glass surface with a light and orange sheen, no
dark fill, rounded controls, orange edge glow, and readable icon-and-label links.
Preserve normal top spacing on internal pages. At tablet widths, use a
compact brand header and a right-side modal drawer. On narrow phones, present
the same menu as a bottom-inset panel matching the mobile reference. Both
layouts use a labeled menu button, close button, overlay dismissal, Escape
handling, focus management, and reduced-motion support. Keep safe-area insets
clear.

Before and during an active edition, show the ordered public links Início,
Informações, Programação, and Confirme sua presença. Omit the RSVP link when
the server says registration is unavailable. Keep Entrar separate and aligned
to the desktop navigation's right edge; include it after the ordered links in
the mobile menu. Once signed in, replace Entrar with the existing Sair action.
Show Dashboard beside Sair only after Clerk confirms the signed-in user's
public role is admin; keep it hidden while the user or role is loading and for
all other roles. The `/dashboard` route remains protected by server-side admin
authorization.
Use the selected edition's server-backed lifecycle state, including RSVP
availability, rather than a browser clock. Preserve the event information and
program sections during voting so those links remain valid.

After an edition ends, show Início followed only by available destinations:
Vencedores when that edition's results are published, Galeria de fotos when a
published party album has accessible photos, and Edições anteriores when an
older edition has published results or a published album. Keep event slugs on
result and album links and exclude the currently viewed edition from the
previous-editions list. Show no disabled placeholders. With no edition, keep the
existing waiting page and show no unpublished results or empty albums.

### Voting

Guests follow `/votacao` to event-specific `/acesso`, choose Google or an email
verification code, and return to voting. Clerk authenticates both guests and
administrators; the server links each guest to their existing event registration. Keep voting actions tied to
the event's open state and enforce voting integrity on the server as described
in the architecture guide.

### Meu Halloween guest portal

The portal requires a verified Clerk session linked to an RSVP for the selected
edition. Show that edition's event and RSVP status, a link to the editable RSVP
profile, and only contestant entries owned by or guarded by that RSVP. Keep
entry type and status readable in Portuguese; show a clear empty state when the
guest has no entries. Contestant status remains private to its owner. Keep
category voting available to every linked attendee, whether or not they have a
contestant entry. Enable category links and the “Ir para votação” action only
while that edition's voting is open, and mark completed categories as
unavailable.

From the authenticated voting categories page, guests can open their selected
edition's Meu Halloween portal to view entries, RSVP/event status, and profile
controls. While contestant entries are open, owners can upload or replace one
photo per entry after confirming permission to use it. Show the current photo,
file limits, pending upload, success, and error states. Junior entries require
the guardian to confirm permission. Guardians can add multiple child entries in
a junior category with the child's name, an optional costume title, and a clear
instruction to finish the private draft by uploading a photo and confirming
permission. Once entries close, creation and upload controls are disabled. The
profile page still lets guests update the single “Nome e sobrenome” field.
While entries are open, a guest can create one group entry per edition with a
group name, a group-eligible category, and an optional costume title. Do not ask
for member rosters or invitations. The creator can vote for their group, and
the entry remains a private draft until its required photo is uploaded. Keep
the RSVP email private. Once contestant enrollment is closed, profile edits do
not change the contestant name frozen for voting and results.

Category tiles use purple backgrounds, emoji, and a text title. Completed
categories become gray and translucent, prevent navigation, expose
`aria-disabled`, and leave the tab order.

Candidate search stays near the top as a sticky control. Selecting a candidate
adds an orange ring and `scale-105` to their card and exposes `aria-pressed` on
the button. Editing the search clears the selection. A fixed bottom “Votar”
button appears after selection and changes to “Votando...” during submission.
After success, candidate buttons are disabled and a persistent success toast
offers “Voltar” to the category list. Failure displays an error toast.

### Results and photo galleries

Results category tiles reuse the purple category treatment. Results details
give first place a large name, photograph, and medal, with remaining participants
in compact rows. Counts and percentages support the ranking; categories with
no votes have an explicit message. Public views exclude email addresses.

The contestant photo gallery shows only eligible contestant imagery and remains
separate from party photos. Its existing gallery lists entries with photos,
sorted by name, and searches within the selected event. Event navigation marks
the selected edition with an orange background and `aria-current`. The enlarged
viewer supports previous/next buttons, arrow keys, swipes, Escape, and backdrop
click; navigation wraps at either end. Dialogs focus the close button, lock body
scrolling, and restore prior focus when closed.

The party photo album is a separate edition-scoped gallery at
`/album-da-festa`. Before an admin publishes it, show a waiting state without
exposing photos or their metadata. After publication, use the same dark
surfaces, orange accents, responsive thumbnail grid, and accessible
enlarged-photo viewer. Clearly identify this as party photography and avoid
reusing contestant names, eligibility, or photo controls. Keep published
editions navigable while an unpublished edition shows only its waiting state.

In Meu Halloween, show the party-photo upload area after the edition's event
start. Use a multiple-file picker, local previews, per-file progress, and clear
upload errors. Explain that photos stay private until the organization
publishes the album. Show the guest only their own uploaded photos before
publication; provide an opening-time message before the party starts. Keep this
upload flow separate from contestant photo controls.

### Administration

The public feature navigation is hidden throughout `/dashboard`; the admin
dashboard uses its own desktop sidebar and native modal drawer on mobile.
Its main bar shows the current section and a right-aligned edition dropdown
labeled “Selecionar edição”, followed by a “Ver site” link to the public home;
choosing a year opens that edition's overview. On mobile, keep the edition
selector and public-site link together on a row below the brand and menu button.
Include the selected year in the sidebar brand and browser document title.
Sign-out stays at the bottom of the desktop sidebar and mobile drawer. Mark the
current navigation destination with `aria-current`; preserve the selected year
in every section link. The mobile drawer uses native dialog focus containment,
Escape handling, scroll locking, and focus restoration.

Resolve a requested `?year=YYYY` to that edition. For an unknown year, show an
explanation and fall back to the active edition or newest available edition.
When no edition is active, identify the newest archived edition; when there are
no editions, show an explicit empty state and keep first-edition creation under
settings. Legacy `/dashboard?tab=settings|guests` links redirect to their
settings or guest routes while retaining the requested year.

Guest management, voting/results, gallery, and settings routes reuse the
existing edition-scoped controls. The overview aggregates the exact selected
edition, labels its current lifecycle state, and links to relevant modules.
When no edition exists, explain how to create the first one. Archived editions
remain available for historical reads and server-supported publication work;
never suggest opening RSVP creation or the first voting round for an archived
edition. Do not present planned controls as operational. Event settings show the timezone and the
scheduled RSVP and event starts. Keep RSVP availability, manual contestant
entry controls, voting round controls, results publication, and party album
publication visibly distinct. Disabled controls and explanatory text
communicate lifecycle restrictions; UI availability must match server rules.

Guest and contestant dialogs make ownership and edition clear. Before the first
voting opening, authorized actions follow the contestant-entry state. After it,
administrators may correct existing records and replace existing contestant
photos, with an audit record, while contestant membership remains fixed. Pending
requests disable relevant inputs and show progress text; failures appear inline.

## Responsive and interaction patterns

The project uses mobile-first utilities and Tailwind's default breakpoints:
`sm` at 640px, `md` at 768px, `lg` at 1024px, and `2xl` at 1536px are used across
the UI.

| Pattern                      | Small screens                  | Larger screens                                                     |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| Homepage information         | Stacked cards                  | Three columns at `lg`                                              |
| Program and post-event links | One column                     | Two columns at `lg`                                                |
| Voting categories            | One column                     | Two columns at `lg`, first tile spans both                         |
| Candidate grid               | Two columns                    | Three at `sm`, four at `lg`                                        |
| Results detail               | Stacked winner and ranking     | Two columns at `lg`                                                |
| Photo grid                   | Two columns                    | Three at `md`, six at `2xl`                                        |
| Admin dashboard shell        | Mobile header and modal drawer | Sidebar at `lg`, edition dropdown in main bar, sign-out in sidebar |
| Dashboard fields             | Stacked                        | Paired fields and horizontal layout at `md`                        |

Keep search and primary actions reachable while scrolling. Account for the fixed
vote action and bottom-centered Sonner notifications, which are offset by
`12vh`. Avoid covering names, form errors, or the final grid row when extending
these layouts.

Shared page loading uses a centered orange spinner on a full-height canvas.
Empty searches display short text such as “Nenhum resultado.” or
“Nenhuma foto encontrada”. Unavailable features and missing pages provide a
centered heading and a home link. The global error page offers
“Tentar novamente”. Reuse these patterns and retain an actionable recovery path
where one exists.

## Accessibility guidance and review

Existing support includes accessible names for inputs and photo controls,
participant image alternatives, selected-candidate `aria-pressed`, disabled
category semantics, a native modal dialog for the admin drawer, and polite live
status in the voting lifecycle panel. Checklist completion uses text in addition
to its visual icon. These features do not establish full accessibility
compliance.

Recommended improvements for future UI work:

- Continue checking visible keyboard focus and contrast on every route.
  Registration fields, admin category controls, guest editor fields, and the
  guest search now have explicit focus indicators.
- Keep custom dialogs contained and restore focus on close. The admin drawer uses
  the browser's native modal-dialog behavior; verify its Escape, overlay, and
  route-link paths at mobile widths.
- Verify contrast for every text/action combination, especially white text on
  orange, and supplement color or opacity with meaningful text or semantics.
- The decorative hero video is hidden when reduced motion is requested; the
  dark hero background remains as its static alternative.
- Give the shared loading spinner an accessible status label and preserve
  logical heading structure; some card titles currently use generic elements.
- Check long names, large text, and narrow viewports for overflow, especially in
  winner headings, photo captions, dashboard dialogs, and event navigation.

For UI changes, review narrow and wide layouts, keyboard navigation, dialog
opening and closing, empty searches, request failures, pending submissions,
authentication, and event lifecycle restrictions. Follow the repository's
[validation requirements](AGENTS.md) for code changes. Documentation changes
need formatting and link checks only.
