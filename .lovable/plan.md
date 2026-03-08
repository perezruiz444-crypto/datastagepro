

# Siguiente: Fase 3 (Stripe) + Fase 4 (Bloqueo UI Premium)

## Fase 3: Integración Stripe

1. **Habilitar Stripe** usando la integración nativa de Lovable (requiere tu Stripe secret key)
2. Crear producto "Data Stage Pro" con precio mensual
3. Edge function para webhooks de Stripe (checkout completado, suscripción cancelada/renovada) que actualice la tabla `subscriptions`
4. Edge function para crear sesión de checkout vinculada al usuario autenticado

## Fase 4: Bloqueo de funciones premium en UI

1. **Processor.tsx**: Interceptar cambio de tab a Anual/Histórico/Multi-Anual
   - Si no autenticado → redirigir a `/auth`
   - Si autenticado sin suscripción → mostrar modal de upgrade
   - Agregar badges "PRO" en los tabs premium
2. **Modal de Upgrade**: Componente con beneficios, precio y botón que inicia Stripe Checkout
3. **Hook `useAuth`**: Ya tiene `isPro` — se usará para controlar acceso

## Fase 5: Landing page

1. Sección de **Pricing** (Free vs Pro) con tabla comparativa
2. Actualizar Hero/CTA mencionando "Gratis para reportes mensuales"

## Orden de implementación

Empezaré habilitando Stripe (paso obligatorio antes de escribir código), luego implementaré el bloqueo UI y la landing actualizada.

