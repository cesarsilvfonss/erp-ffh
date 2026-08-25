import { NextResponse } from 'next/server';
import { createOrUpdateClosure } from '@/actions/closure';

// Esta ruta puede ser llamada por Vercel Cron a las 23:59 del último día del mes
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    // Crear el snapshot borrador.
    await createOrUpdateClosure(year, month, false);

    return NextResponse.json({ success: true, message: `Borrador de cierre de ${month + 1}/${year} creado correctamente.` });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
