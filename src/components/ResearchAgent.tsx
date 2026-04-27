import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Shield, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ResearchAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your Research & Verification Agent. How can I help you verify information or research a claim today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    // Use a small timeout to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("research-agent", {
        body: { messages: [...messages, userMessage] },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (err: any) {
      toast.error(err.message || "Failed to get response from agent");
      console.error("Agent error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Research Agent</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Verification Engine Active</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none border border-border"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground p-3 rounded-2xl rounded-tl-none border border-border flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span className="text-xs italic">Researching...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask the agent to verify something..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10"
                />
                <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
      
      {isOpen && (
        <Button
          size="icon"
          variant="outline"
          className="h-14 w-14 rounded-full shadow-lg absolute inset-0 bg-background border-border"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

export default ResearchAgent;
