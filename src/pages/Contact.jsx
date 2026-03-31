import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, MessageCircleMore } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const initialForm = {
  name: "",
  subject: "",
  message: "",
};

export default function Contact() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: currentUser?.full_name || "",
    }));
  }, [currentUser]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);

    try {
      await base44.support.sendContact({
        name: form.name,
        email: currentUser?.email,
        subject: form.subject,
        message: form.message,
      });

      toast({
        title: "Mensagem enviada",
        description: "Recebemos sua mensagem e vamos responder pelo email cadastrado.",
      });
      setForm({
        name: currentUser?.full_name || "",
        subject: "",
        message: "",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível enviar",
        description: error.message || "Tente novamente em instantes.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Contato</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use este espaço para suporte, dúvidas, críticas e sugestões.
        </p>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-primary" />
                Email de suporte
              </CardTitle>
              <CardDescription>Canal principal para atendimento.</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:kashdashboard@gmail.com" className="text-sm font-semibold text-primary hover:underline">
                kashdashboard@gmail.com
              </a>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircleMore className="h-5 w-5 text-primary" />
                Telegram
              </CardTitle>
              <CardDescription>Contato rápido para suporte e dúvidas.</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="https://t.me/kashdashboard" target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
                @kashdashboard
              </a>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Enviar mensagem</CardTitle>
              <CardDescription>
                Sua mensagem será encaminhada para o email oficial do Kash Dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Nome</Label>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Seu nome"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={currentUser?.email || ""} disabled readOnly className="bg-muted/60 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-subject">Assunto</Label>
                  <Input
                    id="contact-subject"
                    value={form.subject}
                    onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                    placeholder="Ex: dúvida sobre assinatura"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Mensagem</Label>
                  <Textarea
                    id="contact-message"
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Escreva aqui sua dúvida, crítica ou sugestão."
                    className="min-h-36"
                    required
                  />
                </div>

                <Button type="submit" className="w-full rounded-xl" disabled={sending}>
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? "Enviando..." : "Enviar mensagem"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
