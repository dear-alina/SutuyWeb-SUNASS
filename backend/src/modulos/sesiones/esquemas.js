import { z } from "../../compartido/zod.js";
import { registro, respuestaJson, respuestaProblema } from "../../compartido/esquemas-comunes.js";

export const esquemaRuc = z.string().regex(/^[0-9]{11}$/, "El RUC debe tener 11 dígitos.");

export const esquemaIngreso = registro.register(
  "Ingreso",
  z
    .strictObject({
      institucion: z.enum(["sunass", "eps"]),
      usuario: z.email("Ingrese un correo válido.").openapi({ description: "Correo de la cuenta.", example: "persona@eps.example" }),
      clave: z.string().min(1, "Ingrese su clave.").max(72),
      ruc: z.string().optional().openapi({ description: "Obligatorio si institucion es eps.", example: "99000000002" }),
    })
    .superRefine((datos, contexto) => {
      if (datos.institucion !== "eps") return;
      const resultado = esquemaRuc.safeParse(datos.ruc ?? "");
      if (!resultado.success) {
        contexto.addIssue({ code: "custom", path: ["ruc"], message: datos.ruc ? "El RUC debe tener 11 dígitos." : "Ingrese el RUC de la empresa." });
      }
    }),
);

export const esquemaPerfil = registro.register(
  "Perfil",
  z.object({
    usuarioId: z.uuid(),
    nombre: z.string(),
    cargo: z.string().nullable(),
    correo: z.string().nullable(),
    rol: z.enum(["admin", "sunass", "eps"]),
    area: z.string().nullable(),
    codigoEps: z.string().nullable().openapi({ example: "EPS02" }),
    nombreEps: z.string().nullable(),
    proveedor: z.enum(["correo", "microsoft"]),
  }),
);

registro.registerPath({
  method: "post",
  path: "/api/v1/sesiones",
  summary: "Iniciar sesión con correo y clave",
  description: "Fija las cookies de sesión HttpOnly. El cuerpo de la respuesta nunca contiene tokens.",
  request: { body: { content: { "application/json": { schema: esquemaIngreso } } } },
  responses: {
    200: respuestaJson("Perfil del usuario; la sesión queda en cookies.", esquemaPerfil),
    401: respuestaProblema("credenciales_invalidas"),
    403: respuestaProblema("acceso_pendiente u origen_no_permitido"),
    422: respuestaProblema("validacion_fallida"),
    429: respuestaProblema("demasiados_intentos"),
  },
});

registro.registerPath({
  method: "delete",
  path: "/api/v1/sesiones/actual",
  summary: "Cerrar la sesión actual",
  responses: { 204: { description: "Sesión cerrada y cookies borradas." }, 401: respuestaProblema("sesion_requerida") },
});

for (const ruta of ["/api/v1/sesiones/microsoft", "/api/v1/sesiones/microsoft/retorno"]) {
  registro.registerPath({
    method: "get",
    path: ruta,
    summary: "Reservado para Microsoft Entra ID",
    responses: { 503: respuestaProblema("proveedor_no_configurado") },
  });
}

registro.registerPath({
  method: "get",
  path: "/api/v1/perfil",
  summary: "Perfil del usuario autenticado",
  responses: { 200: respuestaJson("Perfil del usuario.", esquemaPerfil), 401: respuestaProblema("sesion_requerida") },
});
