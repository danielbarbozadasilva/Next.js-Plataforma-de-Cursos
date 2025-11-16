import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  RefreshCcw,
  Download,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

async function getInstructorFinances(instructorId: string) {
  // Buscar perfil do instrutor
  const instructorProfile = await db.instructorProfile.findUnique({
    where: { userId: instructorId },
  });

  // Receita total
  const totalRevenue = await db.orderItem.aggregate({
    where: {
      course: {
        instructorId,
      },
      order: {
        status: "COMPLETED",
      },
    },
    _sum: {
      priceAtPurchase: true,
    },
  });

  // Reembolsos (usando pedidos FAILED como proxy)
  const refunds = await db.orderItem.aggregate({
    where: {
      course: {
        instructorId,
      },
      order: {
        status: "FAILED",
      },
    },
    _sum: {
      priceAtPurchase: true,
    },
    _count: true,
  });

  // Saques
  const payouts = await db.instructorPayout.findMany({
    where: {
      instructorId,
    },
    orderBy: {
      requestedAt: "desc",
    },
  });

  // Saques processados
  const processedPayouts = await db.instructorPayout.aggregate({
    where: {
      instructorId,
      status: "PROCESSED",
    },
    _sum: {
      amount: true,
    },
  });

  // Calcular receita líquida (70% da receita bruta)
  const instructorRevenue = Number(totalRevenue._sum.priceAtPurchase || 0) * 0.7;
  const instructorRefunds = Number(refunds._sum.priceAtPurchase || 0) * 0.7;
  const withdrawnAmount = Number(processedPayouts._sum.amount || 0);

  return {
    balance: Number(instructorProfile?.balance || 0),
    totalRevenue: instructorRevenue,
    refunds: {
      total: instructorRefunds,
      count: refunds._count,
    },
    withdrawn: withdrawnAmount,
    available: instructorRevenue - instructorRefunds - withdrawnAmount,
    payouts,
  };
}

export default async function FinancesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const finances = await getInstructorFinances(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finanças</h1>
          <p className="text-muted-foreground">
            Gerencie seus ganhos e solicite saques
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Solicitar Saque
        </Button>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Disponível
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(finances.available)}
            </div>
            <p className="text-xs text-muted-foreground">
              Disponível para saque
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(finances.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              70% das vendas brutas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reembolsos</CardTitle>
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(finances.refunds.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {finances.refunds.count} reembolso(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sacado
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(finances.withdrawn)}
            </div>
            <p className="text-xs text-muted-foreground">
              {finances.payouts.filter((p) => p.status === "PROCESSED").length}{" "}
              saque(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Saques */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Saques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {finances.payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum saque solicitado ainda
              </p>
            ) : (
              finances.payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {payout.status === "PENDING" && (
                        <Clock className="h-5 w-5 text-orange-500" />
                      )}
                      {payout.status === "PROCESSED" && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {payout.status === "FAILED" && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatCurrency(Number(payout.amount))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Solicitado em{" "}
                        {new Date(payout.requestedAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {payout.status === "PENDING" && (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                    {payout.status === "PROCESSED" && (
                      <div>
                        <Badge className="bg-green-500">Processado</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {payout.processedAt &&
                            new Date(payout.processedAt).toLocaleDateString(
                              "pt-BR"
                            )}
                        </p>
                      </div>
                    )}
                    {payout.status === "FAILED" && (
                      <div>
                        <Badge variant="destructive">Falhou</Badge>
                        {payout.notes && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            {payout.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Como funcionam os pagamentos?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Você recebe 70% do valor de cada venda</li>
              <li>Os saques são processados em até 7 dias úteis</li>
              <li>Valor mínimo para saque: R$ 50,00</li>
              <li>Reembolsos são deduzidos automaticamente do seu saldo</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
