import { motion } from "framer-motion";
import { Building2, Ship, Truck } from "lucide-react";

const audiences = [
  { icon: Building2, title: "Agentes aduanales", description: "Simplifica el procesamiento de documentos de importación y exportación." },
  { icon: Ship, title: "Importadores y exportadores", description: "Accede rápidamente a tus datos de comercio exterior en un formato manejable." },
  { icon: Truck, title: "Logística y comercio exterior", description: "Integra fácilmente los datos convertidos en tus flujos de trabajo." },
];

const Audience = () => (
  <section className="py-24 bg-muted/30">
    <div className="container mx-auto px-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          ¿Para quién es?
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {audiences.map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.12 }}
            className="text-center p-8"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <a.icon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-2">{a.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{a.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Audience;
