import { motion } from "framer-motion";
import { Upload, Cog, Download } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Sube tu archivo .zip",
    description: "Carga el archivo comprimido con tus documentos Data Stage de comercio exterior.",
  },
  {
    icon: Cog,
    title: "Unificación automática",
    description: "La herramienta descomprime y unifica todos los archivos .asc en un solo conjunto de datos.",
  },
  {
    icon: Download,
    title: "Descarga en Excel",
    description: "Obtén un archivo Excel limpio y organizado, listo para trabajar.",
  },
];

const HowItWorks = () => (
  <section id="como-funciona" className="py-24 bg-muted/30">
    <div className="container mx-auto px-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          ¿Cómo funciona?
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Tres pasos simples. Sin configuración.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="relative bg-card rounded-2xl border p-8 text-center shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              {i + 1}
            </div>
            <div className="mt-4 mb-5 flex justify-center">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
