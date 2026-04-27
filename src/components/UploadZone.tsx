import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Image, Film, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type InputType = "text" | "image" | "video";

interface UploadZoneProps {
  onSubmit: (input: { type: InputType; content: string; file?: File }) => void;
  isAnalyzing: boolean;
}

const UploadZone = ({ onSubmit, isAnalyzing }: UploadZoneProps) => {
  const [activeTab, setActiveTab] = useState<InputType>("text");
  const [textInput, setTextInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      const isImage = file.type.startsWith("image/");
      setActiveTab(isImage ? "image" : "video");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (activeTab === "text" && textInput.trim()) {
      onSubmit({ type: "text", content: textInput });
    } else if (selectedFile) {
      onSubmit({ type: activeTab, content: selectedFile.name, file: selectedFile });
    }
  };

  const tabs = [
    { id: "text" as InputType, label: "Text", icon: FileText },
    { id: "image" as InputType, label: "Image", icon: Image },
    { id: "video" as InputType, label: "Video", icon: Film },
  ];

  return (
    <div className="rounded-lg bg-card border border-border p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
        <h2 className="font-display text-lg font-semibold text-foreground">Input Analysis</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-md p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedFile(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "text" ? (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Textarea
              placeholder="Paste a news article, social media post, or claim to verify..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="min-h-[140px] bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono text-sm resize-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground font-mono">{textInput.length} chars</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="media"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer ${
                dragOver ? "border-primary bg-accent/30" : "border-border hover:border-muted-foreground"
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {activeTab === "image" ? <Image className="w-8 h-8 text-primary" /> : <Film className="w-8 h-8 text-primary" />}
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-muted-foreground hover:text-destructive ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Drop {activeTab === "image" ? "an image" : "a video"} here or <span className="text-primary underline">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeTab === "image" ? "PNG, JPG, WEBP up to 10MB" : "MP4, MOV up to 50MB"}
                  </p>
                  <input
                    type="file"
                    accept={activeTab === "image" ? "image/*" : "video/*"}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={handleSubmit}
        disabled={isAnalyzing || (activeTab === "text" ? !textInput.trim() : !selectedFile)}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold tracking-wide"
      >
        {isAnalyzing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Verify Content
          </span>
        )}
      </Button>
    </div>
  );
};

export default UploadZone;
