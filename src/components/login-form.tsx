"use client";

import { useActionState } from "react";
import { signInStudio } from "@/app/admin/actions";

type ActionState = { error?: string } | undefined;

const initialState: ActionState = undefined;

export function LoginForm() {
  const [state, action, pending] = useActionState(
    async (_state: ActionState, formData: FormData): Promise<ActionState> =>
      signInStudio(formData),
    initialState,
  );

  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <label className="block space-y-2">
        <span className="text-sm">Username</span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="w-full border border-rule bg-paper px-3 py-2"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="w-full border border-rule bg-paper px-3 py-2"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-clay" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink px-4 py-2 text-paper disabled:opacity-60"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
