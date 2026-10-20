import ContestantEntryEditor from "@/components/guest/contestant-entry-editor";
import type { OwnedContestantEntry } from "@/lib/contestant-entries";

const entryTypeLabels: Record<ContestantEntryType, string> = {
  individual: "Fantasia individual",
  junior: "Fantasia infantil",
  group: "Fantasia em grupo",
};

export default function ContestantEntryCard({
  eventId,
  entry,
  photoUrl,
  category,
  entryOpen,
}: {
  eventId: string;
  entry: OwnedContestantEntry;
  photoUrl: string | null;
  category?: Category;
  entryOpen: boolean;
}) {
  return (
    <article className="grid gap-4 rounded-2xl border border-white/10 bg-stone-900 p-5">
      {entry.entryType !== "individual" ? (
        <div className="grid gap-1">
          <p className="text-sm text-orange-300">
            {entryTypeLabels[entry.entryType]}
          </p>
          <h2 className="text-xl font-semibold">{entry.displayName}</h2>
          {entry.entryType === "group" && category ? (
            <p className="text-stone-300">
              {category.icon ? `${category.icon} ` : ""}
              {category.title}
            </p>
          ) : null}
        </div>
      ) : null}
      <ContestantEntryEditor
        eventId={eventId}
        entryId={entry._id}
        entryType={entry.entryType}
        initialDisplayName={entry.displayName}
        initialTitle={entry.costumeTitle}
        initialPhotoUrl={photoUrl}
        enabled={
          entryOpen && entry.status !== "locked" && entry.status !== "withdrawn"
        }
      />
    </article>
  );
}
