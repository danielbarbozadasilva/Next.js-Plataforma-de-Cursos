import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mensagens Diretas</h1>
        <p className="text-muted-foreground">
          Converse com seus alunos em tempo real
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Sistema de Mensagens em Desenvolvimento
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            O sistema de mensagens diretas com Socket.io será implementado em
            breve. Você poderá conversar com seus alunos em tempo real e
            receber notificações instantâneas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
