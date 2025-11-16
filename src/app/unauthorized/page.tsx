import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Negado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página. Esta área é
            restrita a administradores.
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/login">
              <Button variant="outline">Fazer Login</Button>
            </Link>
            <Link href="/">
              <Button>Voltar ao Início</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
