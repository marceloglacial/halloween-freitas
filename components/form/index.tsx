import { FC, JSX } from "react";

const Form: FC = (): JSX.Element => {
  return (
    <form className="mx-auto grid w-full max-w-sm gap-8" autoComplete="off">
      <label className="flex flex-col gap-1">
        <input
          type="text"
          name="fullName"
          required
          className="rounded-xl border border-orange-500 bg-transparent p-5 text-white placeholder:text-white focus:ring-0 focus:outline-none"
          placeholder="Nome e Sobrenome"
        />
      </label>
      <label className="flex flex-col gap-1">
        <input
          type="email"
          name="email"
          required
          className="rounded-xl border border-orange-500 bg-transparent p-5 text-white placeholder:text-white focus:ring-0 focus:outline-none"
          placeholder="Email"
        />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-orange-500 px-4 py-4 text-lg font-medium text-black transition hover:bg-orange-600"
      >
        Enviar
      </button>
    </form>
  );
};

export default Form;
