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
    answer: "Es el formato estándar definido por la ANAM (Agencia Nacional de Aduanas de México) para la consulta de información de pedimentos. Contiene archivos .asc separados por pipes (|) organizados en dos niveles: a nivel pedimento (archivos 501-520, 701-702) y a nivel partida (archivos 551-558). El archivo 501 contiene los datos generales del pedimento y el 551 las partidas.",
  },
  {
    question: "¿Qué tipos de archivos contiene un Data Stage?",
    answer: "Un Data Stage puede contener hasta 22 tipos de archivos: Datos generales (501), Transporte (502), Guías (503), Contenedores (504), Facturas (505), Fechas del pedimento (506), Casos (507), Cuentas aduaneras (508), Tasas (509), Contribuciones (510), Observaciones (511), Descargos (512), Destinatarios (520), Partidas (551), Mercancías (552), Permisos (553), Casos partida (554), Cuentas partida (555), Tasas partida (556), Contribuciones partida (557), Observaciones partida (558), Rectificaciones (701) y Diferencias (702).",
  },
  {
    question: "¿Qué formatos acepta la herramienta?",
    answer: "Acepta archivos .zip que contengan archivos .asc en su interior. También permite cargar archivos .asc sueltos para reportes históricos y archivos .xlsx para consolidación multi-anual. Todo se convierte automáticamente a Excel (.xlsx).",
  },
  {
    question: "¿Necesito instalar algún software?",
    answer: "No. La herramienta funciona completamente en línea desde tu navegador. Solo sube tu archivo y obtén tu Excel. No requiere registro ni cuentas externas.",
  },
  {
    question: "¿Es seguro subir mis archivos?",
    answer: "Sí. Los archivos se procesan directamente en tu navegador de forma local. No se envían a ningún servidor externo ni se almacenan permanentemente.",
  },
  {
    question: "¿Qué modos de reporte están disponibles?",
    answer: "Cuatro modos: Mensual (un ZIP por mes), Anual (12 ZIPs consolidados en un solo reporte con columna de mes), Consolidado por Tabla (múltiples archivos .asc del mismo tipo con etiquetas de periodo) e Histórico (procesamiento batch de múltiples ZIPs de distintos años, generando todas las tablas consolidadas con columnas de Año y Mes).",
  },
  {
    question: "¿Cuáles son los archivos críticos de un Data Stage?",
    answer: "Los archivos 501 (Datos generales) y 551 (Partidas) son considerados críticos. El 501 contiene la información base del pedimento y el 551 el detalle de cada partida. La herramienta te alerta si faltan en tu ZIP.",
  },
  {
    question: "¿Tiene algún costo?",
    answer: "La herramienta es completamente gratuita. No requiere registro, suscripción ni cuentas de terceros.",
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
