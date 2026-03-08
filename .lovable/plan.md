

# Plan: Crear cuentas internas con acceso Pro gratuito

Entiendo perfectamente. Quieres cuentas que tengan acceso a todas las funciones premium (Anual, Histórico, Multi-Anual) sin pasar por Stripe. Esto es común para el dueño del producto y su equipo interno.

## Cómo funciona

El sistema verifica acceso Pro mediante la función `has_active_subscription`, que busca en la tabla `subscriptions` un registro con `status = 'active'` y `current_period_end > now()`. Podemos insertar registros manualmente con una fecha de expiración muy lejana (ej. año 2099).

## Pasos

### Paso 1: Registrarse en la app
Tú y cada miembro de tu equipo deben crear una cuenta normal en `/auth` (con email o Google). Esto es necesario para obtener un `user_id`.

### Paso 2: Activar acceso Pro manualmente
Una vez registrados, insertaré registros en la tabla `subscriptions` con:
- `status = 'active'`
- `current_period_end = '2099-12-31'`
- Sin `stripe_customer_id` ni `stripe_subscription_id` (ya que no pasan por Stripe)

También actualizaré el rol en `user_roles` de `user` a `pro`.

## Lo que necesito de ti

1. **Regístrate** tú y tu equipo en la app (navega a `/auth`)
2. **Dime los emails** de las cuentas que crearon, para que pueda activarles el acceso Pro

¿Ya tienen cuentas creadas o necesitas registrarte primero?

