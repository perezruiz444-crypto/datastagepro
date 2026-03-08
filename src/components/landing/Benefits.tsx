import { motion } from "framer-motion";
import { Clock, ShieldCheck, Globe, Zap } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Ahorra horas de trabajo",
    description: "Automatiza el proceso manual de abrir, copiar y pegar datos de múltiples archivos .asc.",
  },
  {
    icon: ShieldCheck,
    title: "Sin errores de transcripción",
    description: "Eliminación total de errores humanos al copiar datos entre formatos.",
  },
  {
    icon: Globe,
    title: "Estándar de comercio exterior",
    description: "Compatible con el formato oficial Data Stage utilizado en aduanas de México.",
  },
  {
    icon: Zap,
    title: "Procesamiento instantáneo",
    description: "Convierte cientos de archivos en segundos, no en horas.",
  },
];

const Benefits = () => (
  <section className="py-24">
    <div className="container mx-auto px-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          ¿Por qué usar esta herramienta?
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Diseñada para profesionales de comercio exterior que valoran su tiempo.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-6">
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex gap-5 p-6 rounded-2xl border bg-card hover:shadow-sm transition-shadow"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <b.icon className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{b.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Benefits;
