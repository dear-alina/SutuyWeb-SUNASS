# SutuyWeb - C14

SutuyWeb es una plataforma colaborativa para la gestión y el seguimiento de trámites financieros de las empresas prestadoras de servicios de saneamiento (EPS) en SUNASS.

Su objetivo es facilitar el seguimiento de cada expediente: conocer quién lo tiene a cargo, en qué etapa se encuentra, cuáles son los plazos y qué documentos están pendientes. También contará con un copiloto para consultar información de los expedientes y apoyar su revisión, con referencias a los documentos utilizados. Las decisiones y aprobaciones seguirán a cargo de las personas responsables.

El MVP está en su etapa inicial. Este repositorio contiene la estructura del proyecto y las herramientas para organizar su desarrollo; las funcionalidades se incorporarán progresivamente.

## Organización del proyecto

El proyecto reúne en un único repositorio la aplicación web, el backend, el copiloto y los archivos que definirán la base de datos.

```text
SutuyWeb-SUNASS/
├── frontend/   Aplicación web con Next.js y TypeScript
├── backend/    API con Node.js, JavaScript y Express
├── copiloto/   Servicio de consulta documental con Python y FastAPI
├── bd/         Migraciones, scripts y políticas de acceso para Supabase
└── openspec/   Especificaciones y propuestas de cambios
```

## Arquitectura prevista

El backend seguirá una arquitectura de monolito modular: las funciones del sistema se organizarán en módulos dentro de una misma aplicación. El copiloto funcionará como un servicio separado al que solo podrá acceder el backend.

La aplicación web se comunicará con el backend para consultar información y realizar operaciones, incluido el inicio de sesión. El backend centralizará las reglas de negocio, los permisos, los plazos y las etapas de los trámites, y validará los datos con Zod.

Usaremos PostgreSQL alojado en Supabase, junto con sus servicios de autenticación y almacenamiento privado de archivos. La carpeta `bd/` contendrá los archivos necesarios para definir y mantener la base de datos.

El copiloto buscará información en los documentos mediante RAG —generación de respuestas apoyada en información recuperada— y utilizará un modelo de lenguaje abierto ejecutado localmente. Los vectores para la búsqueda se almacenarán en Supabase con pgvector.

```text
Aplicación web → Backend → Supabase
                   ↓
                Copiloto → Modelo local
```

## Forma de trabajo

El desarrollo se organizará con OpenSpec. Antes de implementar un cambio, describiremos su propósito, los requisitos y las tareas necesarias en `openspec/changes/`.

Cada propuesta podrá abarcar una o varias partes del proyecto. Una vez implementada y verificada, se archivará el cambio y se actualizarán las especificaciones correspondientes en `openspec/specs/`.

Las propuestas y especificaciones se redactarán en español.

## Información que no debe publicarse

Este repositorio es público. No se deben subir credenciales, archivos `.env` con secretos, datos personales, expedientes reales ni documentos confidenciales.

Los ejemplos de configuración usarán valores ficticios y las pruebas utilizarán datos sintéticos. Las dependencias instaladas, los archivos generados y los modelos locales también quedarán fuera del control de versiones.
