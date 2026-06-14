import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      original_name, 
      brand, 
      fraiche_code, 
      gender, 
      cost_per_gram 
    } = body

    const { data, error } = await resend.emails.send({
      from: 'Fraiche Finder <onboarding@resend.dev>',
      to: ['davidosioherrera@gmail.com'], // ← Cambia esto por tu correo real
      subject: `Nueva sugerencia: ${original_name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981; margin-bottom: 24px;">📩 Nueva sugerencia de código Fraiche</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; font-weight: 600; color: #71717a; width: 180px;">Perfume Original</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: white;">${original_name}</td>
            </tr>
            
            ${brand ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; font-weight: 600; color: #71717a;">Marca</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: white;">${brand}</td>
            </tr>` : ''}
            
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; font-weight: 600; color: #71717a;">Código Fraiche</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #10b981; font-family: monospace; font-size: 18px; font-weight: bold;">${fraiche_code}</td>
            </tr>
            
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; font-weight: 600; color: #71717a;">Género</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: white;">${gender}</td>
            </tr>

            ${cost_per_gram ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; font-weight: 600; color: #71717a;">Costo por gramo</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #10b981; font-weight: 600;">$${cost_per_gram} MXN</td>
            </tr>` : ''}
          </table>

          <p style="color: #71717a; font-size: 14px; margin-top: 32px;">
            Esta sugerencia fue enviada desde el sitio Fraiche Finder.<br>
            Puedes agregarla manualmente desde Supabase.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Error enviando email:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error en API suggest:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}