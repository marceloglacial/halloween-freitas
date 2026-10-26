import React from "react";

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
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!showModal) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    nameInputRef.current?.focus();
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      const returnFocusTarget = returnFocusRef.current;
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
    };
  }, [showModal, closeModal]);

  if (!showModal) return null;
  const isEdit = !!modalUser._id;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-lg">
        <h2 id="user-modal-title" className="mb-4 text-xl font-bold">
          {isEdit ? "Editar participante" : "Adicionar participante"}
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
            placeholder="Nome completo"
            required
            disabled={loading}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
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
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          />
          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-stone-300">
            Todo RSVP pode concorrer individualmente. A participação aparece no
            concurso somente depois que o convidado envia uma foto no Meu
            Halloween; grupos são cadastrados separadamente.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded bg-gray-700 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
              onClick={closeModal}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
              disabled={loading}
            >
              {isEdit
                ? loading
                  ? "Salvando…"
                  : "Salvar alterações"
                : loading
                  ? "Adicionando…"
                  : "Adicionar participante"}
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
              className="rounded-lg border border-orange-400 px-4 py-2 text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
            >
              Redefinir vínculo de acesso
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="mt-2 text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
