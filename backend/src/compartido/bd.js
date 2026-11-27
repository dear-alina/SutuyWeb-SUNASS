import pg from "pg";

/** Pool de PostgreSQL con rol de servidor. */
export function crearBd(urlConexion) {
  const pool = new pg.Pool({ connectionString: urlConexion, max: 10 });

  return {
    consultar: (texto, valores) => pool.query(texto, valores),

    /** Ejecuta fn en una transacción. */
    async enTransaccion(fn) {
      const cliente = await pool.connect();
      try {
        await cliente.query("begin");
        const resultado = await fn(cliente);
        await cliente.query("commit");
        return resultado;
      } catch (error) {
        await cliente.query("rollback");
        throw error;
      } finally {
        cliente.release();
      }
    },

    cerrar: () => pool.end(),
  };
}
