import React from "react";
import { CldImage, CldUploadButton } from "next-cloudinary";

export function UserEditModal({
  showModal,
  modalUser,
  setModalUser,
  handleEdit,
  handleCreate,
  handleResetAccess,
  closeModal,
  loading,
  error,
}: UserEditModalProps & {
  handleCreate: (user: Partial<User>) => void;
  handleResetAccess: (user: Partial<AdminUser>) => void;
}) {
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!showModal) return;
    nameInputRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showModal, closeModal]);

  if (!showModal) return null;
  const isEdit = !!modalUser._id;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-lg">
        <h2 id="user-modal-title" className="mb-4 text-xl font-bold">
          {isEdit ? "Edit User" : "Create User"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isEdit) {
              handleEdit(modalUser);
            } else {
              handleCreate(modalUser);
            }
          }}
          className="space-y-4"
        >
          <input
            ref={nameInputRef}
            aria-label="Nome completo"
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
            aria-label="Email"
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!modalUser.group}
              onChange={(e) =>
                setModalUser({ ...modalUser, group: e.target.checked })
              }
              disabled={loading}
            />
            <span className="text-white">Grupo</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!modalUser.junior}
              onChange={(e) =>
                setModalUser({ ...modalUser, junior: e.target.checked })
              }
              disabled={loading}
            />
            <span className="text-white">Junior</span>
          </label>
          {modalUser.imageUrl ? (
            <CldImage
              src={modalUser.imageUrl}
              width={900}
              height={600}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              alt={`Foto de ${modalUser.fullName || "participante"}`}
              className="h-80 cursor-pointer overflow-hidden rounded object-contain"
              onClick={() => setModalUser({ ...modalUser, imageUrl: "" })}
            />
          ) : (
            <CldUploadButton
              uploadPreset="halloween-freitas"
              className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-orange-700"
              onSuccess={(e) => {
                // @ts-expect-error next-cloudinary returns info with public_id
                setModalUser((prev) => ({
                  ...prev,
                  // @ts-expect-error next-cloudinary returns info with public_id
                  imageUrl: e.info?.public_id,
                }));
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
              {isEdit
                ? loading
                  ? "Updating"
                  : "Update"
                : loading
                  ? "Creating"
                  : "Create"}
            </button>
          </div>
        </form>
        {isEdit && modalUser.clerkUserId && (
          <div className="mt-4 grid gap-2 border-t border-gray-700 pt-4">
            <p className="text-sm">
              Este convidado já tem uma conta vinculada. Editar o email não
              transfere o acesso. Salve o email correto antes de redefinir o
              vínculo.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleResetAccess(modalUser)}
              className="rounded-lg border border-orange-400 px-4 py-2 text-orange-300 disabled:opacity-50"
            >
              Redefinir vínculo de acesso
            </button>
          </div>
        )}
        {error && <div className="mt-2 text-red-500">{error}</div>}
      </div>
    </div>
  );
}
