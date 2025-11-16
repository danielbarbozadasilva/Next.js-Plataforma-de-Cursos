import { InstructorSidebar } from "@/components/instructor/sidebar";
import { InstructorHeader } from "@/components/instructor/header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Verificar se o usuário está autenticado e tem permissão de INSTRUTOR ou ADMIN
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return (
    <div className="flex h-screen">
      <InstructorSidebar />
      <div className="flex flex-1 flex-col">
        <InstructorHeader />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
