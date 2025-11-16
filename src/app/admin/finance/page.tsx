import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

async function getFinancialStats() {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Receita do mês atual
  const currentMonthRevenue = await db.order.aggregate({
    where: {
      status: "COMPLETED",
      createdAt: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Receita do mês passado
  const lastMonthRevenue = await db.order.aggregate({
    where: {
      status: "COMPLETED",
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Total de receita
  const totalRevenue = await db.order.aggregate({
    where: {
      status: "COMPLETED",
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Pedidos pendentes
  const pendingOrders = await db.order.count({
    where: {
      status: "PENDING",
    },
  });

  // Saques pendentes
  const pendingPayouts = await db.instructorPayout.aggregate({
    where: {
      status: "PENDING",
    },
    _sum: {
      amount: true,
    },
    _count: true,
  });

  // Calcular comissões
  const platformCommission = Number(totalRevenue._sum.totalAmount || 0) * 0.3;
  const instructorCommission = Number(totalRevenue._sum.totalAmount || 0) * 0.7;

  return {
    currentMonth: Number(currentMonthRevenue._sum.totalAmount || 0),
    lastMonth: Number(lastMonthRevenue._sum.totalAmount || 0),
    total: Number(totalRevenue._sum.totalAmount || 0),
    pendingOrders,
    pendingPayouts: {
      amount: Number(pendingPayouts._sum.amount || 0),
      count: pendingPayouts._count,
    },
    platformCommission,
    instructorCommission,
  };
}

async function getRecentTransactions() {
  const transactions = await db.order.findMany({
    take: 20,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          course: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  return transactions;
}

async function getPendingPayouts() {
  const payouts = await db.instructorPayout.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: {
      requestedAt: "desc",
    },
    include: {
      instructor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return payouts;
}

export default async function FinancePage() {
  const stats = await getFinancialStats();
  const transactions = await getRecentTransactions();
  const pendingPayouts = await getPendingPayouts();

  const growth =
    stats.lastMonth > 0
      ? ((stats.currentMonth - stats.lastMonth) / stats.lastMonth) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão Financeira</h1>
        <p className="text-muted-foreground">
          Controle de transações, gateways e saques
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Receita do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.currentMonth)}
            </div>
            <p
              className={`text-xs flex items-center gap-1 ${
                growth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {growth >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(1)}% vs mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissão plataforma: {formatCurrency(stats.platformCommission)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saques Pendentes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.pendingPayouts.amount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPayouts.count} solicitações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saques Pendentes */}
      {pendingPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saques Pendentes ({pendingPayouts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instrutor</TableHead>
                  <TableHead>Data da Solicitação</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payout.instructor.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {payout.instructor.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(payout.requestedAt)}
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(Number(payout.amount))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default">
                          Aprovar
                        </Button>
                        <Button size="sm" variant="destructive">
                          Rejeitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Curso(s)</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {formatDateTime(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {transaction.items
                          .map((item) => item.course.title)
                          .join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(Number(transaction.totalAmount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.gateway || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === "COMPLETED"
                            ? "default"
                            : transaction.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {transaction.status === "COMPLETED"
                          ? "Concluído"
                          : transaction.status === "PENDING"
                          ? "Pendente"
                          : "Falhou"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {transaction.gatewayTransactionId?.substring(0, 10) ||
                        "-"}
                      ...
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumo de Comissões */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comissão da Plataforma (30%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(stats.platformCommission)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total arrecadado pela plataforma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissão dos Instrutores (70%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(stats.instructorCommission)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total pago aos instrutores
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
