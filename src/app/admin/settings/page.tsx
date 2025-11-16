import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Configure as preferências do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Plataforma</label>
              <input
                type="text"
                defaultValue="EAD Platform"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de Contato</label>
              <input
                type="email"
                defaultValue="contato@eadplatform.com"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Comissão da Plataforma (%)
              </label>
              <input
                type="number"
                defaultValue="30"
                min="0"
                max="100"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Comissão do Instrutor (%)
              </label>
              <input
                type="number"
                defaultValue="70"
                min="0"
                max="100"
                disabled
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gateways de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Stripe</p>
                <p className="text-sm text-muted-foreground">
                  Pagamentos internacionais
                </p>
              </div>
              <Button variant="outline" size="sm">
                Configurar
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Mercado Pago</p>
                <p className="text-sm text-muted-foreground">
                  Pagamentos Brasil
                </p>
              </div>
              <Button variant="outline" size="sm">
                Configurar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Armazenamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provedor de Vídeo</label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option>Mux</option>
                <option>AWS S3</option>
                <option>Vimeo</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provedor de Arquivos</label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option>AWS S3</option>
                <option>Google Cloud Storage</option>
                <option>Azure Blob Storage</option>
              </select>
            </div>
            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
