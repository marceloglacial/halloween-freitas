# UI design reference

Halloween dos Freitas is an annual party website for guests registering their
attendance, voting on costumes, viewing published results, and browsing photos.
Administrators manage events and participants through a separate dashboard.
This document records the existing UI and gives guidance for extending it.
Recommendations are identified explicitly; they do not imply that the current
application already implements them.

For lifecycle, authorization, and privacy requirements, see
[Architecture and domain rules](docs/architecture.md). For setup and deployment,
see [Operations](docs/operations.md).

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
`pt-BR`. Event details and availability should follow the selected event rather
than assume a fixed year. The homepage's program currently lists costume award
categories in static copy; voting and results render event category records.

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

| Screen                     | Purpose and layout                                                | Important states                                                                       |
| -------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/`                        | Hero, countdown, party information, program, registration, footer | Pre-event, registration upcoming/open/closed, voting soon/open/ended, post-event       |
| `/votacao`                 | Verified Google/email-code access for registered guests           | Entering, rejected email or connection error, voting unavailable                       |
| `/votacao/categories`      | Category tiles with guest greeting                                | Available category, already voted, guest session unavailable                           |
| `/votacao/categories/[id]` | Candidate search, selectable photo grid, floating vote action     | No matches, selected candidate, submitting, vote success or failure                    |
| `/resultados`              | Published category tiles and event navigation                     | Published results, no published results                                                |
| `/resultados/[id]`         | Prominent first place and remaining ranked participants           | Vote counts and percentages, category with no votes                                    |
| `/fotos`                   | Event navigation, name search, photo grid and enlarged viewer     | No photos or matches, selected photo                                                   |
| `/dashboard`               | Event selector, settings and participants, event creation         | Authentication/authorization, active or archived event, validation and pending actions |

### Homepage and registration

Before the event starts, show event information, the program, and the registration
section. The countdown appears when an event start is available and the initial
homepage state is pre-event. The registration form is shown only when registration
is open; otherwise the section displays the opening or closing date.

Registration asks for full name and email and explains that each adult needs a
separate email. During submission, disable the inputs and action and show
“Enviando...”. Success resets the form and leaves a persistent “Presença confirmada!” panel; duplicate registration,
server rejection, and connection failure produce error toasts.

At the event start, the homepage lifecycle area replaces pre-event content with
a centered panel for “Votação em breve”, “Votação aberta”, or “Votação encerrada”.
Only the open state offers an active link to vote. The lifecycle area refreshes
the current event every ten seconds and retains its last valid event on fetch
failure. The hero is separate from this polling component, so its countdown
visibility is based on the initial server-rendered state.

Published results after voting ends, an archived event, or no current event show
the post-event cards linking to results and photos. Those links do not bypass
results publication checks.

### Voting

Guests follow `/votacao` to event-specific `/acesso`, choose Google or an email
verification code, and return to voting. Clerk authenticates both guests and
administrators; the server links each guest to their existing event registration. Keep voting actions tied to
the event's open state and enforce voting integrity on the server as described
in the architecture guide.

Category tiles use purple backgrounds, emoji, and a text title. Completed
categories become gray and translucent, prevent navigation, expose
`aria-disabled`, and leave the tab order.

Candidate search stays near the top as a sticky control. Selecting a candidate
adds an orange ring and `scale-105` to their card and exposes `aria-pressed` on
the button. Editing the search clears the selection. A fixed bottom “Votar”
button appears after selection and changes to “Votando...” during submission.
After success, candidate buttons are disabled and a persistent success toast
offers “Voltar” to the category list. Failure displays an error toast.

### Results and gallery

Results category tiles reuse the purple category treatment. Results details
give first place a large name, photograph, and medal, with remaining participants
in compact rows. Counts and percentages support the ranking; categories with
no votes have an explicit message. Public views exclude email addresses.

The gallery lists participants with photos, sorted by name, and searches within
the selected event. Event navigation appears when multiple events are available
and marks the selected event with an orange background and `aria-current`.
The enlarged gallery viewer supports previous/next buttons, arrow keys, swipes,
Escape, and clicking the backdrop; navigation wraps at either end. Gallery and
results image dialogs focus their close button, lock body scrolling, and restore
the prior focus when closed.

### Administration

The dashboard provides event selection, status badges, settings and participant
tabs, and a form to create a new year. Event settings include the timezone,
registration opening, event start, derived registration closing, manual voting
controls, and results publication. Disabled controls and explanatory text
communicate lifecycle restrictions; UI availability must match server rules.

Participant dialogs edit name, email, group/junior eligibility, and a Cloudinary
photo. Pending requests disable relevant inputs and show progress text; failures
appear inline. Linked participants have an explicit “Redefinir vínculo de acesso”
action with confirmation; ordinary email edits preserve ownership. The participant dialog focuses the name field and handles Escape,
but does not share all focus and scroll behavior of the photo dialogs.

## Responsive and interaction patterns

The project uses mobile-first utilities and Tailwind's default breakpoints:
`sm` at 640px, `md` at 768px, `lg` at 1024px, and `2xl` at 1536px are used across
the UI.

| Pattern                      | Small screens              | Larger screens                              |
| ---------------------------- | -------------------------- | ------------------------------------------- |
| Homepage information         | Stacked cards              | Three columns at `lg`                       |
| Program and post-event links | One column                 | Two columns at `lg`                         |
| Voting categories            | One column                 | Two columns at `lg`, first tile spans both  |
| Candidate grid               | Two columns                | Three at `sm`, four at `lg`                 |
| Results detail               | Stacked winner and ranking | Two columns at `lg`                         |
| Photo grid                   | Two columns                | Three at `md`, six at `2xl`                 |
| Dashboard fields/header      | Stacked                    | Paired fields and horizontal header at `md` |

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
category semantics, named dialogs, and polite live status in the voting lifecycle
panel. These features do not establish full accessibility compliance.

Recommended improvements for future UI work:

- Provide visible keyboard focus throughout. Some registration inputs currently
  remove outlines and focus rings without a replacement.
- Contain keyboard focus inside modal dialogs and consistently restore it on
  close. Current dialogs do not implement a focus trap.
- Verify contrast for every text/action combination, especially white text on
  orange, and supplement color or opacity with meaningful text or semantics.
- Respect reduced motion and provide an alternative to continuous hero video.
- Give the shared loading spinner an accessible status label and preserve
  logical heading structure; some card titles currently use generic elements.
- Check long names, large text, and narrow viewports for overflow, especially in
  winner headings, photo captions, dashboard dialogs, and event navigation.

For UI changes, review narrow and wide layouts, keyboard navigation, dialog
opening and closing, empty searches, request failures, pending submissions,
authentication, and event lifecycle restrictions. Follow the repository's
[validation requirements](AGENTS.md) for code changes. Documentation changes
need formatting and link checks only.
