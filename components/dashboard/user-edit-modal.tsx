import React from "react";
import { CldImage, CldUploadButton } from "next-cloudinary";

export function UserEditModal({
  showModal,
  modalUser,
  setModalUser,
  handleEdit,
  closeModal,
  loading,
  error,
}: UserEditModalProps) {
  if (!showModal) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Edit User</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit(modalUser);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            value={modalUser.fullName || ""}
            onChange={(e) =>
              setModalUser({ ...modalUser, fullName: e.target.value })
            }
            placeholder="Full Name"
            required
            disabled={loading}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          />
          <input
            type="email"
            value={modalUser.email || ""}
            onChange={(e) =>
              setModalUser({ ...modalUser, email: e.target.value })
            }
            placeholder="Email"
            required
            disabled={loading}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          />
          {modalUser.imageUrl ? (
            <CldImage
              src={modalUser.imageUrl}
              width={900}
              height={600}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              alt="User Image"
              className="cursor-pointer overflow-hidden rounded"
              onClick={() => setModalUser({ ...modalUser, imageUrl: "" })}
            />
          ) : (
            <CldUploadButton
              uploadPreset="halloween-freitas"
              className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-orange-700"
              onSuccess={(e) => {
                // @ts-expect-error next-cloudinary returns info with public_id
                setModalUser({ ...modalUser, imageUrl: e.info.public_id });
              }}
            >
              Upload an image
            </CldUploadButton>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded bg-gray-700 px-4 py-2 text-white"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
              disabled={loading}
            >
              Updat{loading ? "ing" : "e"}
            </button>
          </div>
        </form>
        {error && <div className="mt-2 text-red-500">{error}</div>}
      </div>
    </div>
  );
}
