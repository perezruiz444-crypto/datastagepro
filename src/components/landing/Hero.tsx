import { motion } from "framer-motion";
import { FileArchive, FileSpreadsheet, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOL_URL = "https://aistudio.google.com/apps/a4fded63-c3df-497c-a6d8-e5fa6cef3cc1?showAssistant=true&showCode=true";

const Hero = () => (
  <section className="relative overflow-hidden py-24 md:py-36">
    {/* Subtle background gradient */}
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
    </div>

    <div className="container mx-auto px-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center"
      >
        <span className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide">
          Comercio exterior · México
        </span>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-foreground">
          Transforma tus archivos{" "}
          <span className="text-primary">Data Stage</span>{" "}
          a Excel en segundos
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Descomprime archivos <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">.zip</code>, 
          unifica múltiples <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">.asc</code> y 
          exporta todo a un solo archivo Excel. Sin esfuerzo.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-base px-8 h-12">
            <a href={TOOL_URL} target="_blank" rel="noopener noreferrer">
              Comenzar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base px-8 h-12">
            <a href="#como-funciona">Ver cómo funciona</a>
          </Button>
        </div>
      </motion.div>

      {/* File flow visualization */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="mt-20 flex items-center justify-center gap-4 md:gap-8"
      >
        {[
          { icon: FileArchive, label: ".zip", color: "text-primary" },
          { icon: FileText, label: ".asc", color: "text-muted-foreground" },
          { icon: FileSpreadsheet, label: ".xlsx", color: "text-secondary" },
        ].map((item, i) => (
          <div key={item.label} className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-card border flex items-center justify-center shadow-sm">
                <item.icon className={`h-8 w-8 md:h-10 md:w-10 ${item.color}`} />
              </div>
              <span className="text-sm font-mono text-muted-foreground">{item.label}</span>
            </div>
            {i < 2 && (
              <ArrowRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default Hero;
