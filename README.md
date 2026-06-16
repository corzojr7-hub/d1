# Sistema Operativo D1

Plataforma web interna para el control operativo de tiendas retail. Permite a supervisores y mandos intermedios registrar instrucciones operativas, controlar eventos de merma con evidencia fotográfica, y consultar el historial completo de operaciones en tiempo real. La app está diseñada como una aplicación móvil progresiva con interfaz táctil optimizada para uso en piso de venta.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Extras:** react-zxing (escaneo de código de barras), lucide-react (iconografía), sonner (notificaciones toast)

## Variables de entorno

Para desplegar en Vercel, configurar las siguientes variables en Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```

No subir `.env.local` al repositorio. Ver `docs/DEPLOY_VERCEL.md` para la guía completa de despliegue.
