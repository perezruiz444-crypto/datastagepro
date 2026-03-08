import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOL_URL = "https://aistudio.google.com/apps/a4fded63-c3df-497c-a6d8-e5fa6cef3cc1?showAssistant=true&showCode=true";

const CTASection = () => (
  <section className="py-24">
    <div className="container mx-auto px-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center bg-primary/5 border border-primary/10 rounded-3xl p-12 md:p-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Empieza a convertir ahora
        </h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
          Sin instalaciones, sin registros. Solo sube tu archivo y obtén tu Excel.
        </p>
        <Button size="lg" asChild className="text-base px-10 h-12">
          <a href={TOOL_URL} target="_blank" rel="noopener noreferrer">
            Abrir la herramienta
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
