import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import {
  getPublicPartyAlbum,
  getPublicPartyPhoto,
  getPublishedPartyAlbumEventIds,
  serializePublicPartyGalleryPhoto,
} from "@/lib/party-photo-writes";

const eventId = new ObjectId("507f1f77bcf86cd799439011");

function fakeDb({
  published,
  photos = [],
  publishedIds = [],
  photoEventIds = [],
}: {
  published: boolean;
  photos?: unknown[];
  publishedIds?: ObjectId[];
  photoEventIds?: ObjectId[];
}) {
  const findOne = vi
    .fn()
    .mockResolvedValue(published ? { _id: new ObjectId() } : null);
  const toArray = vi.fn().mockResolvedValue(photos);
  const sort = vi.fn().mockReturnValue({ toArray });
  const albumFind = vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue(
      publishedIds.map((id) => ({ eventId: id })),
    ),
  });
  const photoFind = vi.fn().mockReturnValue({
    sort,
    toArray: vi.fn().mockResolvedValue(
      photoEventIds.map((id) => ({ eventId: id })),
    ),
  });
  const db = {
    collection: vi.fn((name: string) =>
      name === "partyAlbums"
        ? { findOne, find: albumFind }
        : { find: photoFind },
    ),
  } as unknown as Db;
  return { db, findOne, albumFind, photoFind, sort, toArray };
}

describe("public party album reads", () => {
  it("does not query or return photo records while the album is private", async () => {
    const mock = fakeDb({ published: false });

    await expect(getPublicPartyAlbum(mock.db, eventId)).resolves.toEqual({
      published: false,
      photos: [],
    });
    expect(mock.findOne).toHaveBeenCalledWith(
      { eventId, published: true },
      { projection: { _id: 1 } },
    );
    expect(mock.albumFind).not.toHaveBeenCalled();
  });

  it("only selects active photos for the requested edition", async () => {
    const photo = {
      _id: new ObjectId(),
      eventId,
      uploaderRsvpId: new ObjectId(),
      publicId: "private-cloudinary-id",
      assetId: "private-cloudinary-asset",
      format: "jpg",
      width: 1200,
      height: 800,
    };
    const mock = fakeDb({ published: true, photos: [photo] });

    const album = await getPublicPartyAlbum(mock.db, eventId);

    expect(album.published).toBe(true);
    expect(album.photos).toEqual([photo]);
    expect(mock.photoFind).toHaveBeenCalledWith(
      { eventId, removedAt: { $exists: false } },
      {
        projection: {
          _id: 1,
          publicId: 1,
          format: 1,
          width: 1,
          height: 1,
        },
      },
    );
    expect(mock.sort).toHaveBeenCalledWith({ uploadedAt: -1, _id: -1 });
  });

  it("returns only published albums with at least one accessible photo", async () => {
    const oldEvent = new ObjectId();
    const emptyEvent = new ObjectId();
    const mock = fakeDb({
      published: false,
      publishedIds: [oldEvent, emptyEvent],
      photoEventIds: [oldEvent, oldEvent],
    });

    await expect(getPublishedPartyAlbumEventIds(mock.db)).resolves.toEqual(
      new Set([oldEvent.toString()]),
    );
    expect(mock.albumFind).toHaveBeenCalledWith(
      { published: true },
      { projection: { _id: 0, eventId: 1 } },
    );
    expect(mock.photoFind).toHaveBeenCalledWith(
      {
        eventId: { $in: [oldEvent, emptyEvent] },
        removedAt: { $exists: false },
      },
      { projection: { _id: 0, eventId: 1 } },
    );
  });

  it("skips the photo lookup when no album is published", async () => {
    const mock = fakeDb({ published: false });

    await expect(getPublishedPartyAlbumEventIds(mock.db)).resolves.toEqual(
      new Set(),
    );
    expect(mock.photoFind).not.toHaveBeenCalled();
  });

  it("builds app image paths without exposing Cloudinary asset identifiers", () => {
    const photo = {
      _id: new ObjectId("507f1f77bcf86cd799439012"),
      width: 1600,
      height: 1200,
    };

    expect(serializePublicPartyGalleryPhoto(photo, "halloween-2026")).toEqual({
      photoId: "507f1f77bcf86cd799439012",
      previewUrl:
        "/api/party-gallery/507f1f77bcf86cd799439012?event=halloween-2026",
      width: 1600,
      height: 1200,
    });
  });

  it("requires publication and the same edition before resolving an image", async () => {
    const photoId = new ObjectId("507f1f77bcf86cd799439012");
    const findOne = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: new ObjectId() })
      .mockResolvedValueOnce({ publicId: "private-id", format: "webp" });
    const db = {
      collection: vi.fn(() => ({ findOne })),
    } as unknown as Db;

    await expect(getPublicPartyPhoto(db, eventId, photoId)).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledTimes(1);

    await expect(getPublicPartyPhoto(db, eventId, photoId)).resolves.toEqual({
      publicId: "private-id",
      format: "webp",
    });
    expect(findOne).toHaveBeenNthCalledWith(
      2,
      { eventId, published: true },
      { projection: { _id: 1 } },
    );
    expect(findOne).toHaveBeenNthCalledWith(
      3,
      { _id: photoId, eventId, removedAt: { $exists: false } },
      { projection: { publicId: 1, format: 1 } },
    );
  });
});
