import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/lib/brand-icon";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-8">
          <BrandMark size={52} />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Masuk ke Relay</h1>
          <p className="mt-1.5 text-muted-foreground">Kelola pekerjaan lapangan dari HP kamu.</p>
        </div>
        <LoginForm />
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">Relay · Field Operations Task Management</p>
    </main>
  );
}
