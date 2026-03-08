

# Plan: Modelo Freemium con Stripe + Auth

## Resumen

Implementar un sistema freemium donde el **modo Mensual es gratuito** y los modos **Anual, Histórico y Multi-Anual requieren suscripción de pago** mediante Stripe. Se necesita autenticación (email + Google) para vincular suscripciones.

## Fases de implementación

### Fase 1: Habilitar Lovable Cloud + Supabase
- Activar Cloud para tener base de datos, autenticación y edge functions
- Esto es prerequisito para auth y Stripe

### Fase 2: Autenticación (email + Google)
- Crear página `/auth` con login/registro (email + Google OAuth)
- Crear tabla `profiles` vinculada a `auth.users`
- Crear tabla `user_roles` para manejar el estado premium
- Proteger la ruta `/app` con sesión activa (o permitir acceso libre al modo mensual)
- Página `/reset-password` para recuperación de contraseña

### Fase 3: Sistema de suscripciones con Stripe
- Habilitar integración Stripe de Lovable
- Crear producto "Data Stage Pro" con precio mensual
- Edge function para manejar webhooks de Stripe (checkout completado, suscripción cancelada)
- Tabla `subscriptions` para rastrear estado de suscripción por usuario
- Función `has_active_subscription(user_id)` para verificar acceso premium

### Fase 4: Bloqueo de funciones premium en UI
- En `Processor.tsx`: los tabs Anual/Histórico/Multi-Anual muestran un **overlay/modal de upgrade** si el usuario no tiene suscripción activa
- Badge "PRO" en los tabs premium
- Página/modal de pricing con botón de checkout Stripe
- Si el usuario no está logueado → redirigir a `/auth`
- Si está logueado pero sin suscripción → mostrar modal de upgrade con precio y beneficios

### Fase 5: Landing page updates
- Agregar sección de **Pricing** en la landing con plan Free vs Pro
- Actualizar Hero/CTA para mencionar "Gratis para reportes mensuales"
- Agregar link a pricing en la navegación

## Arquitectura de datos

```text
auth.users (Supabase built-in)
    │
    ├── profiles (id, user_id, display_name, avatar_url)
    │
    ├── user_roles (user_id, role: 'user' | 'pro')
    │
    └── subscriptions (id, user_id, stripe_customer_id,
                       stripe_subscription_id, status, 
                       current_period_end)
```

## Flujo del usuario

```text
Landing → "Comenzar" → /auth (si no logueado) → /app
                                                    │
                                    Tab Mensual → funciona libre ✓
                                    Tab Anual   → modal upgrade → Stripe checkout → acceso ✓
```

## Nota importante

Necesitamos habilitar **Lovable Cloud** primero (para Supabase) y luego **Stripe**. Sugiero implementar por fases para no hacer todo de golpe.

**¿Quieres que empecemos con la Fase 1 (habilitar Cloud) y Fase 2 (autenticación)?**

