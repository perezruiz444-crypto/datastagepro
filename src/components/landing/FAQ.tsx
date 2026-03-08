import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿Qué es un archivo Data Stage?",
    answer: "Es un documento estándar utilizado en el comercio exterior de México para registrar información de importaciones y exportaciones. Normalmente viene en formato .asc dentro de archivos comprimidos .zip.",
  },
  {
    question: "¿Qué formatos de archivo acepta la herramienta?",
    answer: "Acepta archivos .zip que contengan uno o más archivos .asc en su interior. La herramienta los descomprime, unifica y convierte automáticamente a formato Excel (.xlsx).",
  },
  {
    question: "¿Necesito instalar algún software?",
    answer: "No. La herramienta funciona completamente en línea desde tu navegador. Solo necesitas subir tu archivo .zip y obtener tu Excel.",
  },
  {
    question: "¿Es seguro subir mis archivos?",
    answer: "Sí. Los archivos se procesan directamente en tu navegador de forma local. No se envían a ningún servidor externo ni se almacenan permanentemente.",
  },
  {
    question: "¿Cuántos archivos .asc puede procesar a la vez?",
    answer: "La herramienta puede procesar múltiples archivos .asc contenidos dentro de un mismo .zip, unificándolos todos en un solo archivo Excel organizado.",
  },
  {
    question: "¿Tiene algún costo?",
    answer: "La herramienta es gratuita. Solo necesitas una cuenta de Google para acceder a Google AI Studio.",
  },
];

const FAQ = () => (
  <section className="py-24">
    <div className="container mx-auto px-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Preguntas frecuentes
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-foreground">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQ;
