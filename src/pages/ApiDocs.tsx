import { MainLayout } from "@/components/layout/MainLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Code2, Globe, Lock, Terminal, FileJson, Copy, Check } from "lucide-react";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { useClipboard } from "@/hooks/useClipboard";

export default function ApiDocs() {
    const { settings } = useWhiteLabel();
    const phpClipboard = useClipboard();
    const nodeClipboard = useClipboard();
    const curlClipboard = useClipboard();

    const phpCode = `<?php
/**
 * ${settings.app_name} API Client - Integração Simples
 */
class ${settings.app_name.replace(/\s+/g, '')}API {
    private $url = "https://SEU_PROJETO.supabase.co/rest/v1";
    private $key = "SUA_ANON_KEY"; // Chave Pública
    private $token = "SEU_TOKEN_JWT"; // Token do Usuário

    public function getLatestNews($limit = 10) {
        $endpoint = $this->url . "/feed_items";
        $params = http_build_query([
            'select' => 'rewritten_title,rewritten_content,rewritten_image,slug,meta_description',
            'status' => 'eq.success',
            'order' => 'created_at.desc',
            'limit' => $limit
        ]);

        $ch = curl_init($endpoint . "?" . $params);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: " . $this->key,
            "Authorization: Bearer " . $this->token,
            "Content-Type: application/json"
        ]);

        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true);
    }
}

// Exemplo de uso:
$api = new ${settings.app_name.replace(/\s+/g, '')}API();
$noticias = $api->getLatestNews(5);
?>`;

    const nodeCode = `const fetchNews = async () => {
  const response = await fetch(
    'https://SEU_PROJETO.supabase.co/rest/v1/feed_items?status=eq.success&select=*',
    {
      headers: {
        'apikey': 'SUA_ANON_KEY',
        'Authorization': 'Bearer SEU_TOKEN_JWT'
      }
    }
  );
  return await response.json();
};`;

    return (
        <MainLayout>
            <Header
                title="Documentação da API"
                subtitle={`Conecte seu site PHP ou qualquer plataforma externa ao ${settings.app_name}`}
            />

            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
                {/* Intro Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Globe className="w-5 h-5" />
                        <h2 className="text-xl font-bold tracking-tight">Conectividade Sem Limites</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                        Nossa API REST permite que você consuma todo o conteúdo processado pela Inteligência Artificial do {settings.app_name} diretamente no seu site, blog ou aplicativo móvel.
                        O acesso é protegido por RLS (Row Level Security), garantindo que cada site veja apenas seus próprios dados.
                    </p>
                </section>

                {/* Authentication Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: "Supabase URL", icon: <Terminal className="w-4 h-4" />, desc: "A URL base do seu servidor de dados." },
                        { title: "Anon Key", icon: <Lock className="w-4 h-4" />, desc: "Sua chave de acesso público seguro." },
                        { title: "JWT Token", icon: <Code2 className="w-4 h-4" />, desc: "O token de autenticação do usuário." },
                    ].map((item, i) => (
                        <Card key={i} className="bg-muted/30 border-border/40">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    {item.icon}
                                    {item.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Code Tabs */}
                <Card className="border-border/40 shadow-xl overflow-hidden bg-zinc-950">
                    <CardHeader className="border-b border-border/10 bg-zinc-900/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Exemplos de Integração</CardTitle>
                                <CardDescription>Copie e cole em seu projeto</CardDescription>
                            </div>
                            <FileJson className="w-6 h-6 text-primary/40" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="php" className="w-full">
                            <TabsList className="w-full justify-start rounded-none border-b border-border/10 bg-zinc-900/30 p-0 h-12">
                                <TabsTrigger value="php" className="data-[state=active]:bg-zinc-800 rounded-none h-full px-6 font-bold">🐘 PHP</TabsTrigger>
                                <TabsTrigger value="nodejs" className="data-[state=active]:bg-zinc-800 rounded-none h-full px-6 font-bold">🟢 Node.js</TabsTrigger>
                                <TabsTrigger value="curl" className="data-[state=active]:bg-zinc-800 rounded-none h-full px-6 font-bold">💻 cURL</TabsTrigger>
                            </TabsList>

                            <TabsContent value="php" className="m-0 relative group">
                                <button
                                    onClick={() => phpClipboard.copy(phpCode)}
                                    className="absolute right-4 top-4 p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400"
                                >
                                    {phpClipboard.copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <pre className="p-6 text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                                    {phpCode}
                                </pre>
                            </TabsContent>

                            <TabsContent value="nodejs" className="m-0 relative group">
                                <button
                                    onClick={() => nodeClipboard.copy(nodeCode)}
                                    className="absolute right-4 top-4 p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400"
                                >
                                    {nodeClipboard.copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <pre className="p-6 text-sm font-mono text-zinc-300 overflow-x-auto">
                                    {nodeCode}
                                </pre>
                            </TabsContent>

                            <TabsContent value="curl" className="m-0 relative group">
                                <button
                                    onClick={() => curlClipboard.copy(`curl -X GET "https://SUA_URL.supabase.co/rest/v1/feed_items?status=eq.success" \\
  -H "apikey: SUA_ANON_KEY" \\
  -H "Authorization: Bearer SEU_TOKEN_JWT"`)}
                                    className="absolute right-4 top-4 p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400"
                                >
                                    {curlClipboard.copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <pre className="p-6 text-sm font-mono text-zinc-300 overflow-x-auto">
                                    {`curl -X GET "https://SUA_URL.supabase.co/rest/v1/feed_items?status=eq.success" \\
  -H "apikey: SUA_ANON_KEY" \\
  -H "Authorization: Bearer SEU_TOKEN_JWT"`}
                                </pre>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Data Fields Table */}
                <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <ChevronRight className="w-5 h-5 text-primary" />
                        Dados Disponíveis no Retorno
                    </h3>
                    <div className="rounded-xl border border-border/40 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border/40">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold">Campo</th>
                                    <th className="px-4 py-3 text-left font-bold">Tipo</th>
                                    <th className="px-4 py-3 text-left font-bold">Descrição</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {[
                                    { field: "rewritten_title", type: "string", desc: "O novo título gerado pela IA." },
                                    { field: "rewritten_content", type: "html/text", desc: "Conteúdo completo pronto para exibir." },
                                    { field: "rewritten_image", type: "url", desc: "Link da imagem otimizada." },
                                    { field: "slug", type: "string", desc: "URL amigável (SEO)." },
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 font-mono text-primary text-xs">{row.field}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                                        <td className="px-4 py-3">{row.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Footer Note */}
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                    <p className="text-sm text-balance">
                        Precisa de um token de longa duração ou ajuda técnica?
                        Entre em contato com o suporte do <strong>{settings.app_name} Admin</strong>.
                    </p>
                </div>
            </div>
        </MainLayout>
    );
}
