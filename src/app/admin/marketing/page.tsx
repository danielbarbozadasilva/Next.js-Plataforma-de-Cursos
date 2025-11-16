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
import { Plus, Edit, Trash2, Tag, TrendingUp, Users } from "lucide-react";

async function getCoupons() {
  const coupons = await db.coupon.findMany({
    orderBy: {
      id: "desc",
    },
  });

  const now = new Date();
  return coupons.map((coupon) => {
    const isExpired = coupon.expiresAt && coupon.expiresAt < now;
    const isMaxedOut = coupon.maxUses && coupon.usedCount >= coupon.maxUses;
    const isActive = !isExpired && !isMaxedOut;

    return {
      ...coupon,
      isExpired,
      isMaxedOut,
      isActive,
    };
  });
}

async function getMarketingStats() {
  const totalCoupons = await db.coupon.count();

  const now = new Date();
  const activeCoupons = await db.coupon.count({
    where: {
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: now } },
      ],
    },
  });

  const totalUsage = await db.coupon.aggregate({
    _sum: {
      usedCount: true,
    },
  });

  return {
    totalCoupons,
    activeCoupons,
    totalUsage: totalUsage._sum.usedCount || 0,
  };
}

export default async function MarketingPage() {
  const coupons = await getCoupons();
  const stats = await getMarketingStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing</h1>
          <p className="text-muted-foreground">
            Gerencie cupons de desconto e estratégias de marketing
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Cupons
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Cupons Ativos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCoupons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Usos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Cupons utilizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Cupons */}
      <Card>
        <CardHeader>
          <CardTitle>Cupons de Desconto</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Nenhum cupom encontrado
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold">
                      {coupon.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {coupon.discountType === "PERCENTAGE"
                          ? "Percentual"
                          : "Fixo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {coupon.discountType === "PERCENTAGE"
                        ? `${Number(coupon.value)}%`
                        : formatCurrency(Number(coupon.value))}
                    </TableCell>
                    <TableCell>
                      {coupon.usedCount}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : " / ∞"}
                    </TableCell>
                    <TableCell>
                      {coupon.expiresAt
                        ? formatDateTime(coupon.expiresAt)
                        : "Sem expiração"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          coupon.isActive
                            ? "default"
                            : coupon.isExpired
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {coupon.isActive
                          ? "Ativo"
                          : coupon.isExpired
                          ? "Expirado"
                          : "Esgotado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Formulário de Novo Cupom */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Cupom</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="code">
                  Código do Cupom
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  placeholder="Ex: PROMO2024"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="discountType">
                  Tipo de Desconto
                </label>
                <select
                  id="discountType"
                  name="discountType"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  required
                >
                  <option value="PERCENTAGE">Percentual (%)</option>
                  <option value="FIXED">Valor Fixo (R$)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="value">
                  Valor
                </label>
                <input
                  type="number"
                  id="value"
                  name="value"
                  placeholder="Ex: 10"
                  step="0.01"
                  min="0"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="maxUses">
                  Usos Máximos (opcional)
                </label>
                <input
                  type="number"
                  id="maxUses"
                  name="maxUses"
                  placeholder="Deixe vazio para ilimitado"
                  min="1"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="expiresAt">
                  Data de Expiração (opcional)
                </label>
                <input
                  type="datetime-local"
                  id="expiresAt"
                  name="expiresAt"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
            </div>

            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Criar Cupom
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Seção de Afiliados (Básico) */}
      <Card>
        <CardHeader>
          <CardTitle>Programa de Afiliados (Em Breve)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              O programa de afiliados permitirá que instrutores e parceiros
              promovam cursos e ganhem comissões.
            </p>
            <p className="text-sm mt-2">
              Funcionalidade em desenvolvimento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
