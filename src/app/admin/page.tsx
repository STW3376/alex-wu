import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { deskConfigured, getAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    const configured = deskConfigured();
    return (
      <div className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h1 className="font-display text-6xl">Studio desk</h1>
        <p className="mt-4 max-w-xl text-ink-soft">Sign in to add a piece.</p>
        <div className="mt-10">
          {!configured ? (
            <p className="text-ink-soft">The studio desk is not configured yet.</p>
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    );
  }

  const { AdminDesk } = await import("./desk");
  return <AdminDesk username={session.username} />;
}
