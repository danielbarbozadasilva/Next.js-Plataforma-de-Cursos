"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Edit, Trash2, Copy } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  value: number;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  courseId: string | null;
  course?: {
    title: string;
  };
}

export default function PromotionsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch("/api/instructor/coupons");
      if (response.ok) {
        const data = await response.json();
        setCoupons(data);
      }
    } catch (error) {
      console.error("Erro ao carregar cupons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCode(coupon.code);
      setDiscountType(coupon.discountType);
      setValue(coupon.value.toString());
      setExpiresAt(
        coupon.expiresAt
          ? new Date(coupon.expiresAt).toISOString().split("T")[0]
          : ""
      );
      setMaxUses(coupon.maxUses?.toString() || "");
    } else {
      setEditingCoupon(null);
      setCode("");
      setDiscountType("PERCENTAGE");
      setValue("");
      setExpiresAt("");
      setMaxUses("");
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingCoupon
        ? `/api/instructor/coupons/${editingCoupon.id}`
        : "/api/instructor/coupons";

      const method = editingCoupon ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          discountType,
          value: parseFloat(value),
          expiresAt: expiresAt || null,
          maxUses: maxUses ? parseInt(maxUses) : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar cupom");
      }

      setShowModal(false);
      fetchCoupons();
    } catch (error) {
      console.error("Erro ao salvar cupom:", error);
      alert("Erro ao salvar cupom");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este cupom?")) {
      return;
    }

    try {
      const response = await fetch(`/api/instructor/coupons/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar cupom");
      }

      fetchCoupons();
    } catch (error) {
      console.error("Erro ao deletar cupom:", error);
      alert("Erro ao deletar cupom");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert("Código copiado!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promoções e Cupons</h1>
          <p className="text-muted-foreground">
            Crie cupons de desconto para seus cursos
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tag className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Nenhum cupom criado ainda
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              Crie cupons de desconto para atrair mais alunos para seus cursos.
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Cupom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {coupon.code}
                  </CardTitle>
                  {coupon.isActive ? (
                    <Badge className="bg-green-500">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {coupon.discountType === "PERCENTAGE"
                      ? `${coupon.value}%`
                      : `R$ ${coupon.value.toFixed(2)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {coupon.discountType === "PERCENTAGE"
                      ? "Desconto Percentual"
                      : "Desconto Fixo"}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usos:</span>
                    <span className="font-medium">
                      {coupon.usedCount}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : " / ∞"}
                    </span>
                  </div>
                  {coupon.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expira em:</span>
                      <span className="font-medium">
                        {new Date(coupon.expiresAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {coupon.course && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Curso:</span>
                      <span className="font-medium truncate max-w-[150px]">
                        {coupon.course.title}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopyCode(coupon.code)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenModal(coupon)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(coupon.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Cupom */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Código do Cupom <span className="text-red-500">*</span>
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="DESCONTO20"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Desconto</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="PERCENTAGE">Percentual (%)</option>
                  <option value="FIXED">Fixo (R$)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Valor <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={discountType === "PERCENTAGE" ? "20" : "50.00"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Expiração</label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Máximo de Usos (Opcional)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!code || !value}>
                  {editingCoupon ? "Salvar" : "Criar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
