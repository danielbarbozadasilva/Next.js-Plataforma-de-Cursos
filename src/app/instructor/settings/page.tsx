import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

async function getInstructorProfile(userId: string) {
  const profile = await db.instructorProfile.findUnique({
    where: { userId },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
    },
  });

  return { profile, user };
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { profile, user } = await getInstructorProfile(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e informações
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil do Instrutor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {user?.name?.charAt(0) || "I"}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{user?.name}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <p className="text-sm text-muted-foreground">
                {profile?.bio || "Nenhuma bio adicionada"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Website</label>
              <p className="text-sm text-muted-foreground">
                {profile?.websiteUrl || "Nenhum website adicionado"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Settings className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Configurações Avançadas em Desenvolvimento
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Em breve você poderá editar seu perfil, alterar preferências de
            notificação e muito mais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
